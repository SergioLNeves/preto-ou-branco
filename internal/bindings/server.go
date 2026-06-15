package bindings

import (
	"archive/tar"
	"bufio"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type ServerStatus struct {
	Active    bool   `json:"active"`
	PublicURL string `json:"public_url"`
	LocalIP   string `json:"local_ip"`
}

type ServerApp struct {
	mu         sync.Mutex
	ctx        context.Context
	cmd        *exec.Cmd
	cancelFunc context.CancelFunc
	publicURL  string
}

func NewServerApp() *ServerApp {
	return &ServerApp{}
}

// InitContext wires the Wails runtime context. Called from app startup, not a Wails binding.
func InitContext(s *ServerApp, ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ctx = ctx
}

func (s *ServerApp) emit(event, msg string) {
	if s.ctx != nil {
		wailsruntime.EventsEmit(s.ctx, event, msg)
	}
}

// binaryPath returns the path to the cloudflared binary in the user cache dir.
func (s *ServerApp) binaryPath() string {
	cacheDir, err := os.UserCacheDir()
	if err != nil {
		cacheDir = os.TempDir()
	}
	dir := filepath.Join(cacheDir, "preto-ou-branco")
	_ = os.MkdirAll(dir, 0o755)
	name := "cloudflared"
	if runtime.GOOS == "windows" {
		name += ".exe"
	}
	return filepath.Join(dir, name)
}

// downloadCloudflared fetches the cloudflared binary if not already present.
func (s *ServerApp) downloadCloudflared() error {
	path := s.binaryPath()
	if _, err := os.Stat(path); err == nil {
		return nil
	}

	s.emit("tunnel:progress", "Baixando cloudflared...")

	goos := runtime.GOOS
	goarch := runtime.GOARCH

	var filename string
	tgz := false
	switch goos {
	case "linux":
		if goarch == "arm64" {
			filename = "cloudflared-linux-arm64"
		} else {
			filename = "cloudflared-linux-amd64"
		}
	case "darwin":
		tgz = true
		if goarch == "arm64" {
			filename = "cloudflared-darwin-arm64.tgz"
		} else {
			filename = "cloudflared-darwin-amd64.tgz"
		}
	case "windows":
		filename = "cloudflared-windows-amd64.exe"
	default:
		filename = "cloudflared-linux-amd64"
	}

	url := "https://github.com/cloudflare/cloudflared/releases/latest/download/" + filename

	resp, err := http.Get(url) //nolint:gosec
	if err != nil {
		return fmt.Errorf("download falhou: %w", err)
	}
	defer resp.Body.Close()

	if tgz {
		return extractCloudflaredTgz(resp.Body, path)
	}

	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, resp.Body)
	return err
}

func extractCloudflaredTgz(r io.Reader, dest string) error {
	gz, err := gzip.NewReader(r)
	if err != nil {
		return err
	}
	defer gz.Close()

	tr := tar.NewReader(gz)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		if hdr.Name == "cloudflared" || strings.HasSuffix(hdr.Name, "/cloudflared") {
			f, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
			if err != nil {
				return err
			}
			defer f.Close()
			_, err = io.Copy(f, tr)
			return err
		}
	}
	return fmt.Errorf("binário cloudflared não encontrado no arquivo")
}

// StartTunnel downloads cloudflared if needed, starts a Quick Tunnel, and
// returns the public https URL.
func (s *ServerApp) StartTunnel() (string, error) {
	s.mu.Lock()
	if s.cmd != nil {
		url := s.publicURL
		s.mu.Unlock()
		return url, nil
	}
	s.mu.Unlock()

	if err := s.downloadCloudflared(); err != nil {
		return "", err
	}

	s.emit("tunnel:progress", "Estabelecendo túnel...")

	ctx, cancel := context.WithCancel(context.Background())

	// cloudflared writes logs to stdout; combine both streams to be safe.
	pr, pw := io.Pipe()
	cmd := exec.CommandContext(ctx, s.binaryPath(),
		"tunnel", "--url", "http://localhost:8080",
		"--no-autoupdate",
		"--output", "json",
	)
	cmd.Stdout = pw
	cmd.Stderr = pw

	if err := cmd.Start(); err != nil {
		cancel()
		pw.Close()
		pr.Close()
		return "", fmt.Errorf("erro ao iniciar cloudflared: %w", err)
	}

	// Close the write end when the process exits so the scanner terminates.
	go func() {
		_ = cmd.Wait()
		pw.Close()
	}()

	urlCh := make(chan string, 1)
	errCh := make(chan error, 1)

	go func() {
		scanner := bufio.NewScanner(pr)
		var lastLines []string
		for scanner.Scan() {
			line := scanner.Text()
			lastLines = append(lastLines, line)
			if len(lastLines) > 10 {
				lastLines = lastLines[1:]
			}
			if url := extractCFURL(line); url != "" {
				urlCh <- url
				for scanner.Scan() {
				} // drain
				return
			}
		}
		// Collect recent output to surface a useful error
		recentOutput := strings.Join(lastLines, " | ")
		errCh <- fmt.Errorf("cloudflared encerrou sem fornecer URL. Saída: %s", recentOutput)
	}()

	select {
	case url := <-urlCh:
		s.mu.Lock()
		s.cmd = cmd
		s.cancelFunc = cancel
		s.publicURL = url
		s.mu.Unlock()
		return url, nil
	case err := <-errCh:
		cancel()
		return "", err
	case <-time.After(45 * time.Second):
		cancel()
		return "", fmt.Errorf("timeout aguardando cloudflared (45s)")
	}
}

// StopTunnel stops the cloudflared process.
func (s *ServerApp) StopTunnel() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.cancelFunc != nil {
		s.cancelFunc()
		s.cancelFunc = nil
	}
	if s.cmd != nil {
		_ = s.cmd.Wait()
		s.cmd = nil
	}
	s.publicURL = ""
}

// GetServerStatus returns the current tunnel status.
func (s *ServerApp) GetServerStatus() ServerStatus {
	s.mu.Lock()
	defer s.mu.Unlock()

	return ServerStatus{
		Active:    s.cmd != nil,
		PublicURL: s.publicURL,
		LocalIP:   serverLocalIP(),
	}
}

type cfLog struct {
	Message string `json:"message"`
}

func extractCFURL(line string) string {
	var log cfLog
	if err := json.Unmarshal([]byte(line), &log); err == nil {
		line = log.Message
	}
	for _, word := range strings.Fields(line) {
		clean := strings.Trim(word, ".,:|")
		if strings.Contains(clean, "trycloudflare.com") && strings.HasPrefix(clean, "https://") {
			return clean
		}
	}
	return ""
}

func serverLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "localhost"
	}
	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}
	return "localhost"
}
