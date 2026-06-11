package service

import (
	"context"
	"fmt"

	"preto-ou-branco/internal/domain"
)

type GameService struct {
	repo domain.GameRepository
}

func NewGameService(repo domain.GameRepository) *GameService {
	return &GameService{repo: repo}
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
