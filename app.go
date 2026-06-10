package main

import (
	"context"
	"embed"
	"io/fs"
	"log"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"

	"preto-ou-branco/internal/bindings"
	"preto-ou-branco/internal/domain"
	"preto-ou-branco/internal/handler"
	"preto-ou-branco/internal/middleware"
	"preto-ou-branco/internal/realtime"
	"preto-ou-branco/internal/repository"
	"preto-ou-branco/internal/service"
	"preto-ou-branco/internal/storage/sqlite"
)

type App struct {
	ctx       context.Context
	gameApp   *bindings.GameApp
	authApp   *bindings.AuthApp
	serverApp *bindings.ServerApp
	gameSvc   *service.GameService
	roomSvc   *service.RoomService
}

func NewApp(assets embed.FS) *App {
	db, err := sqlite.Open()
	if err != nil {
		log.Fatalf("database init: %v", err)
	}

	gameRepo := repository.NewGameRepo(db)
	gameSvc := service.NewGameService(gameRepo)
	gameApp := bindings.NewGameApp(gameSvc)

	authRepo := repository.NewAuthRepo(db)
	authSvc := service.NewAuthService(authRepo)
	authApp := bindings.NewAuthApp(authSvc)

	serverApp := bindings.NewServerApp()

	hub := realtime.NewHub()
	roomRepo := repository.NewRoomRepo(db)
	roomSvc := service.NewRoomService(roomRepo, gameSvc, hub)
	roomHandler := handler.NewRoomHandler(roomSvc, hub)

	subFS, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		log.Fatalf("frontend assets: %v", err)
	}

	go startHTTPServer(subFS, authSvc, roomRepo, roomHandler)

	return &App{
		gameApp:   gameApp,
		authApp:   authApp,
		serverApp: serverApp,
		gameSvc:   gameSvc,
		roomSvc:   roomSvc,
	}
}

func startHTTPServer(
	staticFS fs.FS,
	authSvc domain.AuthService,
	roomRepo domain.RoomRepository,
	roomHandler *handler.RoomHandler,
) {
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
	rooms := v1.Group("/rooms")
	rooms.POST("", roomHandler.CreateRoom, bearerAuth)
	rooms.POST("/join", roomHandler.JoinRoom, optionalIdentity)
	rooms.DELETE("/:id", roomHandler.CloseRoom, bearerAuth)
	rooms.PATCH("/:id/settings", roomHandler.UpdateRoomSettings, bearerAuth)
	rooms.POST("/:id/start", roomHandler.StartRoom, bearerAuth)
	rooms.POST("/:id/force-reveal", roomHandler.ForceAdvanceReveal, bearerAuth)
	rooms.GET("/:id/state", roomHandler.GetRoomState, roomIdentity)
	rooms.GET("/:id/results", roomHandler.GetRoomResults, roomIdentity)
	rooms.POST("/:id/vote", roomHandler.SubmitRoomVote, roomIdentity)
	rooms.GET("/:id/ws", roomHandler.WebSocketConnect, roomIdentity)

	// Serve frontend for browser guests — index.html for all non-API routes
	fileServer := http.FileServer(http.FS(staticFS))
	e.GET("/assets/*", echo.WrapHandler(fileServer))
	e.GET("/", func(c echo.Context) error {
		return serveIndex(c, staticFS)
	})
	e.GET("/*", func(c echo.Context) error {
		return serveIndex(c, staticFS)
	})

	if err := e.Start(":8080"); err != nil {
		log.Printf("HTTP server stopped: %v", err)
	}
}

func serveIndex(c echo.Context, staticFS fs.FS) error {
	data, err := fs.ReadFile(staticFS, "index.html")
	if err != nil {
		return c.String(http.StatusNotFound, "not found")
	}
	return c.HTMLBlob(http.StatusOK, data)
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	bindings.InitContext(a.serverApp, ctx)
	go a.scheduleDailyAggregation()
	go a.roomSvc.Tick(ctx)
}

func (a *App) scheduleDailyAggregation() {
	for {
		now := time.Now().UTC()
		next := time.Date(now.Year(), now.Month(), now.Day(), 3, 0, 0, 0, time.UTC)
		if !next.After(now) {
			next = next.Add(24 * time.Hour)
		}
		timer := time.NewTimer(next.Sub(now))
		select {
		case <-timer.C:
			yesterday := next.Add(-24 * time.Hour)
			if err := a.gameSvc.AggregateDailyResults(a.ctx, yesterday); err != nil {
				log.Printf("aggregate daily results: %v", err)
			}
		case <-a.ctx.Done():
			timer.Stop()
			return
		}
	}
}

// LocalIP returns the machine's LAN IPv4 address for sharing with guests.
func (a *App) LocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "localhost"
	}
	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ip4 := ipnet.IP.To4(); ip4 != nil {
				s := ip4.String()
				if strings.HasPrefix(s, "192.") || strings.HasPrefix(s, "10.") || strings.HasPrefix(s, "172.") {
					return s
				}
			}
		}
	}
	return "localhost"
}
