package mobile

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

type tunnelStatus struct {
	active    bool
	publicURL string
}

type tunnelManager struct {
	mu         sync.Mutex
	cmd        *exec.Cmd
	cancelFunc context.CancelFunc
	publicURL  string
}

func newTunnelManager() *tunnelManager {
	return &tunnelManager{}
}

// start launches cloudflared. cloudflaredPath is the full path to the binary;
// on Android the Kotlin side extracts it from assets and passes the path here.
// Pass empty string on desktop — it will download the binary to the cache dir.
func (t *tunnelManager) start(cloudflaredPath string) (string, error) {
	t.mu.Lock()
	if t.cmd != nil {
		url := t.publicURL
		t.mu.Unlock()
		return url, nil
	}
	t.mu.Unlock()

	binPath := cloudflaredPath
	if binPath == "" {
		var err error
		binPath, err = downloadCloudflaredBinary()
		if err != nil {
			return "", err
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	pr, pw := io.Pipe()
	cmd := exec.CommandContext(ctx, binPath,
		"tunnel", "--url", "http://localhost:8080",
		"--no-autoupdate",
		"--output", "json",
	)
	// Em builds Android (cgo, GOOS=android) o resolver cgo já é o default e
	// fala com o netd via Bionic. No desktop (binário oficial CGO_ENABLED=0)
	// esse env é ignorado e o resolver puro-Go (que funciona normalmente em
	// Linux/macOS/Windows) continua sendo usado.
	cmd.Env = append(os.Environ(), "GODEBUG=netdns=cgo")
	cmd.Stdout = pw
	cmd.Stderr = pw

	if err := cmd.Start(); err != nil {
		cancel()
		pw.Close()
		pr.Close()
		return "", fmt.Errorf("erro ao iniciar cloudflared: %w", err)
	}

	go func() {
		_ = cmd.Wait()
		pw.Close()
	}()

	urlCh := make(chan string, 1)
	errCh := make(chan error, 1)

	go func() {
		scanner := bufio.NewScanner(pr)
		var recent []string
		for scanner.Scan() {
			line := scanner.Text()
			recent = append(recent, line)
			if len(recent) > 10 {
				recent = recent[1:]
			}
			if url := extractCFURL(line); url != "" {
				urlCh <- url
				for scanner.Scan() {} // drain
				return
			}
		}
		errCh <- fmt.Errorf("cloudflared encerrou sem URL. Saída: %s", strings.Join(recent, " | "))
	}()

	select {
	case url := <-urlCh:
		t.mu.Lock()
		t.cmd = cmd
		t.cancelFunc = cancel
		t.publicURL = url
		t.mu.Unlock()
		log.Printf("tunnel ativo: %s", url)
		return url, nil
	case err := <-errCh:
		cancel()
		return "", err
	case <-time.After(45 * time.Second):
		cancel()
		return "", fmt.Errorf("timeout aguardando cloudflared (45s)")
	}
}

func (t *tunnelManager) stop() {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.cancelFunc != nil {
		t.cancelFunc()
		t.cancelFunc = nil
	}
	if t.cmd != nil {
		_ = t.cmd.Wait()
		t.cmd = nil
	}
	t.publicURL = ""
}

func (t *tunnelManager) status() tunnelStatus {
	t.mu.Lock()
	defer t.mu.Unlock()
	return tunnelStatus{active: t.cmd != nil, publicURL: t.publicURL}
}

// downloadCloudflaredBinary fetches the linux-amd64 binary to the cache dir.
// On Android the binary comes from APK assets — this is not called there.
func downloadCloudflaredBinary() (string, error) {
	cacheDir, err := os.UserCacheDir()
	if err != nil {
		cacheDir = os.TempDir()
	}
	dir := cacheDir + "/preto-ou-branco"
	_ = os.MkdirAll(dir, 0o755)
	path := dir + "/cloudflared"

	if _, err := os.Stat(path); err == nil {
		return path, nil
	}

	log.Println("baixando cloudflared...")
	resp, err := http.Get("https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64") //nolint:gosec
	if err != nil {
		return "", fmt.Errorf("download falhou: %w", err)
	}
	defer resp.Body.Close()

	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
	if err != nil {
		return "", err
	}
	defer f.Close()
	if _, err := io.Copy(f, resp.Body); err != nil {
		return "", err
	}
	return path, nil
}

type cfLog struct {
	Message string `json:"message"`
}

func extractCFURL(line string) string {
	var entry cfLog
	if err := json.Unmarshal([]byte(line), &entry); err == nil {
		line = entry.Message
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
