package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"

	"preto-ou-branco/internal/domain"
)

type dayVotesCache struct {
	mu        sync.RWMutex
	data      []domain.DayVotesEntry
	expiresAt time.Time
}

func (c *dayVotesCache) get() ([]domain.DayVotesEntry, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.data == nil || time.Now().After(c.expiresAt) {
		return nil, false
	}
	return c.data, true
}

func (c *dayVotesCache) set(data []domain.DayVotesEntry) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data = data
	c.expiresAt = time.Now().Add(10 * time.Minute)
}

type GameService struct {
	repo  domain.GameRepository
	cache *dayVotesCache
}

func NewGameService(repo domain.GameRepository) *GameService {
	return &GameService{repo: repo, cache: &dayVotesCache{}}
}

func (s *GameService) ListCategories(ctx context.Context) ([]domain.CategoryResponse, error) {
	categories, err := s.repo.ListCategories(ctx)
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}
	responses := make([]domain.CategoryResponse, 0, len(categories))
	for _, c := range categories {
		responses = append(responses, domain.CategoryResponse{
			ID:    c.ID.String(),
			Slug:  c.Slug,
			Name:  c.Name,
			Emoji: c.Emoji,
		})
	}
	return responses, nil
}

func (s *GameService) ListQuestionsByCategory(ctx context.Context, categoryID uuid.UUID) ([]domain.QuestionResponse, error) {
	questions, err := s.repo.ListQuestionsByCategory(ctx, categoryID)
	if err != nil {
		return nil, fmt.Errorf("list questions by category: %w", err)
	}
	responses := make([]domain.QuestionResponse, 0, len(questions))
	for _, q := range questions {
		responses = append(responses, domain.QuestionResponse{
			ID:         q.ID.String(),
			CategoryID: q.CategoryID.String(),
			Text:       q.Text,
		})
	}
	return responses, nil
}

func (s *GameService) ListRandomQuestions(ctx context.Context, limit int) ([]domain.QuestionResponse, error) {
	if limit <= 0 || limit > 50 {
		limit = 30
	}
	questions, err := s.repo.ListRandomQuestions(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("list random questions: %w", err)
	}
	responses := make([]domain.QuestionResponse, 0, len(questions))
	for _, q := range questions {
		responses = append(responses, domain.QuestionResponse{
			ID:         q.ID.String(),
			CategoryID: q.CategoryID.String(),
			Text:       q.Text,
		})
	}
	return responses, nil
}

func (s *GameService) SubmitVote(ctx context.Context, questionID string, choice string) (*domain.VoteResultResponse, error) {
	if choice != "preto" && choice != "branco" {
		return nil, domain.ErrInvalidChoice
	}
	qID, err := uuid.Parse(questionID)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", domain.ErrInvalidQuestionID, err)
	}
	tx, err := s.repo.SubmitVoteTx(ctx, qID, choice)
	if err != nil {
		return nil, err
	}
	total := tx.Preto + tx.Branco
	pctPreto, pctBranco := 50, 50
	if total > 0 {
		pctPreto = int(tx.Preto * 100 / total)
		pctBranco = 100 - pctPreto
	}
	return &domain.VoteResultResponse{
		QuestionID: questionID,
		PctPreto:   pctPreto,
		PctBranco:  pctBranco,
		Total:      total,
	}, nil
}

func (s *GameService) GetDayVotes(ctx context.Context) ([]domain.DayVotesEntry, error) {
	if cached, ok := s.cache.get(); ok {
		return cached, nil
	}
	today := time.Now().UTC().Truncate(24 * time.Hour)
	entries, err := s.repo.GetDayVotesLive(ctx, today)
	if err != nil {
		return nil, fmt.Errorf("get day votes: %w", err)
	}
	s.cache.set(entries)
	return entries, nil
}

func (s *GameService) AggregateDailyResults(ctx context.Context, date time.Time) error {
	return s.repo.AggregateDailyResults(ctx, date)
}
