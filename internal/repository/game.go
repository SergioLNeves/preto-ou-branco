package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"preto-ou-branco/internal/domain"
)

var tableQuestion = "question"

type GameRepo struct {
	db *gorm.DB
}

func NewGameRepo(db *gorm.DB) domain.GameRepository {
	return &GameRepo{db: db}
}

func (r *GameRepo) ListRandomQuestions(ctx context.Context, limit int, difficulty string) ([]domain.Question, error) {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	var questions []domain.Question
	if err := r.db.WithContext(ctx).Table(tableQuestion).
		Where("difficulty = ?", difficulty).
		Order("RANDOM()").
		Limit(limit).
		Find(&questions).Error; err != nil {
		return nil, err
	}
	return questions, nil
}
