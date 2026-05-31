package main

import (
	"context"
	"log"
	"time"

	"preto-ou-branco/internal/bindings"
	"preto-ou-branco/internal/repository"
	"preto-ou-branco/internal/service"
	"preto-ou-branco/internal/storage/sqlite"
)

type App struct {
	ctx     context.Context
	gameApp *bindings.GameApp
}

func NewApp() *App {
	db, err := sqlite.Open()
	if err != nil {
		log.Fatalf("database init: %v", err)
	}

	repo := repository.NewGameRepo(db)
	svc := service.NewGameService(repo)
	gameApp := bindings.NewGameApp(svc)

	return &App{gameApp: gameApp}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	go a.scheduleDailyAggregation()
}

// scheduleDailyAggregation runs AggregateDailyResults every day at 03:00 UTC.
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
			if err := a.gameApp.Svc().AggregateDailyResults(a.ctx, yesterday); err != nil {
				log.Printf("aggregate daily results: %v", err)
			}
		case <-a.ctx.Done():
			timer.Stop()
			return
		}
	}
}
