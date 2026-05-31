package domain

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

var (
	ErrCategoryNotFound = fmt.Errorf("category not found")
	ErrQuestionNotFound = fmt.Errorf("question not found")
)

type Category struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key"`
	Slug      string    `gorm:"type:varchar(50);uniqueIndex;not null"`
	Name      string    `gorm:"not null"`
	Emoji     string    `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Question struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key"`
	CategoryID uuid.UUID `gorm:"type:uuid;not null;index"`
	Text       string    `gorm:"not null"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type Vote struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key"`
	QuestionID uuid.UUID `gorm:"type:uuid;not null;index"`
	Choice     string    `gorm:"type:varchar(10);not null"`
	CreatedAt  time.Time
}

type CategoryResponse struct {
	ID    string `json:"id"`
	Slug  string `json:"slug"`
	Name  string `json:"name"`
	Emoji string `json:"emoji"`
}

type QuestionResponse struct {
	ID         string `json:"id"`
	CategoryID string `json:"category_id"`
	Text       string `json:"text"`
}

type VoteResultResponse struct {
	QuestionID string `json:"question_id"`
	PctPreto   int    `json:"pct_preto"`
	PctBranco  int    `json:"pct_branco"`
	Total      int64  `json:"total"`
}

type DayVotesEntry struct {
	QuestionID  string `json:"question_id"`
	Text        string `json:"text"`
	VotesPreto  int    `json:"votes_preto"`
	VotesBranco int    `json:"votes_branco"`
	Total       int    `json:"total"`
}

type VoteTxResult struct {
	Preto  int64
	Branco int64
}

type GameService interface {
	ListCategories(ctx context.Context) ([]CategoryResponse, error)
	ListQuestionsByCategory(ctx context.Context, categoryID uuid.UUID) ([]QuestionResponse, error)
	ListRandomQuestions(ctx context.Context, limit int) ([]QuestionResponse, error)
	SubmitVote(ctx context.Context, questionID string, choice string) (*VoteResultResponse, error)
	GetDayVotes(ctx context.Context) ([]DayVotesEntry, error)
}

type GameRepository interface {
	ListCategories(ctx context.Context) ([]Category, error)
	ListQuestionsByCategory(ctx context.Context, categoryID uuid.UUID) ([]Question, error)
	ListRandomQuestions(ctx context.Context, limit int) ([]Question, error)
	SubmitVoteTx(ctx context.Context, questionID uuid.UUID, choice string) (*VoteTxResult, error)
	GetDayVotesLive(ctx context.Context, date time.Time) ([]DayVotesEntry, error)
	AggregateDailyResults(ctx context.Context, date time.Time) error
}
