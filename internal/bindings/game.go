package bindings

import (
	"context"

	"preto-ou-branco/internal/domain"
	"preto-ou-branco/internal/service"
)

// Service returns the underlying service for internal use (e.g. cron).
// This is intentionally unexported to avoid exposure to the Wails JS bridge.
func (g *GameApp) service() *service.GameService { return g.svc }

// GameApp exposes game methods to the Wails frontend.
// All public methods become TypeScript-callable functions.
type GameApp struct {
	svc *service.GameService
}

func NewGameApp(svc *service.GameService) *GameApp {
	return &GameApp{svc: svc}
}

func (g *GameApp) ListCategories() ([]domain.CategoryResponse, error) {
	return g.svc.ListCategories(context.Background())
}

func (g *GameApp) RandomQuestions(limit int) ([]domain.QuestionResponse, error) {
	return g.svc.ListRandomQuestions(context.Background(), limit)
}

func (g *GameApp) SubmitVote(questionID string, choice string) (*domain.VoteResultResponse, error) {
	return g.svc.SubmitVote(context.Background(), questionID, choice)
}

func (g *GameApp) TodayResults() ([]domain.DayVotesEntry, error) {
	return g.svc.GetDayVotes(context.Background())
}
