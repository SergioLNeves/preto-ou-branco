package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Question struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key"`
	CategoryID uuid.UUID `gorm:"type:uuid;not null;index"`
	Text       string    `gorm:"not null"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type QuestionResponse struct {
	ID         string `json:"id"`
	CategoryID string `json:"category_id"`
	Text       string `json:"text"`
}

type GameService interface {
	ListRandomQuestions(ctx context.Context, limit int) ([]QuestionResponse, error)
}

type GameRepository interface {
	ListRandomQuestions(ctx context.Context, limit int) ([]Question, error)
}
