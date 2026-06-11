// Package mobile exposes a gomobile-compatible API for running the
// preto-ou-branco game server on Android. All exported functions use only
// primitive types (string, int, error) so gomobile can bind them to Kotlin/Java.
//
// Lifecycle:
//
//	StartServer(dbPath, port) → StartTunnel(cloudflaredPath) → GetServerStatus()
//	… game runs …
//	StopTunnel() → StopServer()
package mobile

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"

	"preto-ou-branco/internal/handler"
	"preto-ou-branco/internal/middleware"
	"preto-ou-branco/internal/realtime"
	"preto-ou-branco/internal/repository"
	"preto-ou-branco/internal/service"
	"preto-ou-branco/internal/storage/sqlite"
)

var (
	mu        sync.Mutex
	srv       *mobileServer
	lastError string
)

type mobileServer struct {
	echo    *echo.Echo
	roomSvc *service.RoomService
	cancel  context.CancelFunc
	tunnel  *tunnelManager
}

// StartServer boots SQLite, registers all HTTP/WS routes and starts the room ticker.
// dbPath is the full path to the SQLite file (e.g. "<filesDir>/app.db" on Android).
// port is typically 8080.
func StartServer(dbPath string, port int) error {
	mu.Lock()
	defer mu.Unlock()

	if srv != nil {
		return nil
	}

	db, err := sqlite.OpenAt(dbPath)
	if err != nil {
		lastError = fmt.Sprintf("database: %v", err)
		return fmt.Errorf("database: %w", err)
	}

	authRepo := repository.NewAuthRepo(db)
	authSvc := service.NewAuthService(authRepo)
	authHandler := handler.NewAuthHandler(authSvc)

	hub := realtime.NewHub()
	roomRepo := repository.NewRoomRepo(db)
	gameRepo := repository.NewGameRepo(db)
	gameSvc := service.NewGameService(gameRepo)
	roomSvc := service.NewRoomService(roomRepo, gameSvc, hub)
	roomHandler := handler.NewRoomHandler(roomSvc, hub)

	e := echo.New()
	e.HideBanner = true
	e.Use(echomiddleware.Recover())
	e.Use(echomiddleware.CORSWithConfig(echomiddleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Content-Type", "Authorization", "X-Guest-Token"},
	}))

	bearerAuth := middleware.BearerAuth(authSvc)
	roomIdentity := middleware.RoomIdentity(authSvc, roomRepo)
	optionalIdentity := middleware.OptionalRoomIdentity(authSvc, roomRepo)

	v1 := e.Group("/v1")

	auth := v1.Group("/auth")
	auth.POST("/register", authHandler.Register)
	auth.POST("/login", authHandler.Login)
	auth.GET("/me", authHandler.Me)
	auth.POST("/logout", authHandler.Logout)

	rooms := v1.Group("/rooms")
	rooms.POST("", roomHandler.CreateRoom, bearerAuth)
	rooms.POST("/join", roomHandler.JoinRoom, optionalIdentity)
	rooms.DELETE("/:id", roomHandler.CloseRoom, bearerAuth)
	rooms.PATCH("/:id/settings", roomHandler.UpdateRoomSettings, bearerAuth)
	rooms.POST("/:id/start", roomHandler.StartRoom, bearerAuth)
	rooms.POST("/:id/force-reveal", roomHandler.ForceAdvanceReveal, bearerAuth)
	rooms.POST("/:id/restart", roomHandler.RestartRoom, bearerAuth)
	rooms.GET("/:id/state", roomHandler.GetRoomState, roomIdentity)
	rooms.GET("/:id/results", roomHandler.GetRoomResults, roomIdentity)
	rooms.POST("/:id/vote", roomHandler.SubmitRoomVote, roomIdentity)
	rooms.GET("/:id/ws", roomHandler.WebSocketConnect, roomIdentity)

	// Bind the listener synchronously so srv is only published once the port
	// is actually accepting connections — GetServerStatus()'s "running" flag
	// is used by the mobile app to gate its first HTTP requests.
	ln, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		lastError = fmt.Sprintf("listen: %v", err)
		return fmt.Errorf("listen: %w", err)
	}
	e.Listener = ln

	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		if err := e.Start(""); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("HTTP server stopped: %v", err)
		}
	}()

	go roomSvc.Tick(ctx)

	srv = &mobileServer{
		echo:    e,
		roomSvc: roomSvc,
		cancel:  cancel,
		tunnel:  newTunnelManager(),
	}
	lastError = ""
	return nil
}

// StopServer shuts down Echo and cancels all background goroutines.
func StopServer() error {
	mu.Lock()
	defer mu.Unlock()

	if srv == nil {
		return nil
	}

	srv.cancel()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.echo.Shutdown(ctx); err != nil {
		log.Printf("echo shutdown: %v", err)
	}
	srv.tunnel.stop()
	srv = nil
	return nil
}

// StartTunnel starts a Cloudflare Quick Tunnel and returns the public HTTPS URL.
// cloudflaredPath must be the full path to the cloudflared binary.
// On Android, extract it from APK assets to filesDir first, then pass the path.
// Pass empty string on Linux desktop — the binary will be downloaded automatically.
func StartTunnel(cloudflaredPath string) (string, error) {
	mu.Lock()
	t := srv
	mu.Unlock()

	if t == nil {
		return "", fmt.Errorf("servidor não está rodando — chame StartServer primeiro")
	}
	return t.tunnel.start(cloudflaredPath)
}

// StopTunnel stops the Cloudflare tunnel process.
func StopTunnel() error {
	mu.Lock()
	t := srv
	mu.Unlock()

	if t != nil {
		t.tunnel.stop()
	}
	return nil
}

// GetServerStatus returns a JSON string with the current state:
//
//	{"running": bool, "active": bool, "public_url": "...", "local_ip": "..."}
//
// "running" is true when StartServer has been called.
// "active" is true when StartTunnel has successfully established a tunnel.
func GetServerStatus() string {
	mu.Lock()
	t := srv
	errMsg := lastError
	mu.Unlock()

	type status struct {
		Running   bool   `json:"running"`
		Active    bool   `json:"active"`
		PublicURL string `json:"public_url"`
		LocalIP   string `json:"local_ip"`
		LastError string `json:"last_error"`
	}

	if t == nil {
		b, _ := json.Marshal(status{LastError: errMsg})
		return string(b)
	}

	ts := t.tunnel.status()
	b, _ := json.Marshal(status{
		Running:   true,
		Active:    ts.active,
		PublicURL: ts.publicURL,
		LocalIP:   serverLocalIP(),
		LastError: errMsg,
	})
	return string(b)
}
