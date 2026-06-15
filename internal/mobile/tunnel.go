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
	done       chan struct{}
	publicURL  string
}

func newTunnelManager() *tunnelManager {
	return &tunnelManager{}
}

// start launches cloudflared. cloudflaredPath is the full path to the binary;
// on Android the Kotlin side extracts it from assets and passes the path here.
// Pass empty string on desktop — it will download the binary to the cache dir.
// port is the local HTTP port the game server is listening on.
func (t *tunnelManager) start(cloudflaredPath string, port int) (string, error) {
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
		"tunnel", "--url", fmt.Sprintf("http://localhost:%d", port),
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
		_ = pw.Close()
		_ = pr.Close()
		return "", fmt.Errorf("erro ao iniciar cloudflared: %w", err)
	}

	done := make(chan struct{})

	// Register the running process immediately so stop()/status() observe it
	// even if start() is still waiting for cloudflared to print its URL.
	t.mu.Lock()
	t.cmd = cmd
	t.cancelFunc = cancel
	t.done = done
	t.mu.Unlock()

	// This goroutine is the single owner of cmd.Wait() for the process's
	// whole lifetime — stop() never calls Wait itself, it only cancels and
	// waits on `done`. When the process exits on its own (e.g. cloudflared
	// dropped by the OS after a network change), this also clears cmd/
	// publicURL so status() stops reporting an active tunnel with a dead link.
	go func() {
		_ = cmd.Wait()
		_ = pw.Close()
		t.mu.Lock()
		t.cmd = nil
		t.cancelFunc = nil
		t.publicURL = ""
		t.mu.Unlock()
		close(done)
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
				for scanner.Scan() {
				} // drain
				return
			}
		}
		errCh <- fmt.Errorf("cloudflared encerrou sem URL. Saída: %s", strings.Join(recent, " | "))
	}()

	select {
	case url := <-urlCh:
		t.mu.Lock()
		t.publicURL = url
		t.mu.Unlock()
		log.Printf("tunnel ativo: %s", url)
		return url, nil
	case err := <-errCh:
		cancel()
		<-done
		return "", err
	case <-time.After(45 * time.Second):
		cancel()
		<-done
		return "", fmt.Errorf("timeout aguardando cloudflared (45s)")
	}
}

// stop cancels the running cloudflared process, if any, and waits (with a
// timeout) for the start() goroutine to observe its exit and clear the
// manager state. It never calls cmd.Wait() itself — see start().
func (t *tunnelManager) stop() {
	t.mu.Lock()
	cancel := t.cancelFunc
	done := t.done
	t.mu.Unlock()

	if cancel == nil {
		return
	}
	cancel()

	select {
	case <-done:
	case <-time.After(5 * time.Second):
	}
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
	defer func() { _ = resp.Body.Close() }()

	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
	if err != nil {
		return "", err
	}
	defer func() { _ = f.Close() }()
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
