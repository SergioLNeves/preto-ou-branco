package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"preto-ou-branco/internal/domain"
	"preto-ou-branco/internal/storage/sqlite"
)

type AuthRepo struct {
	db *gorm.DB
}

func NewAuthRepo(db *gorm.DB) *AuthRepo {
	return &AuthRepo{db: db}
}

func (r *AuthRepo) CreateUser(ctx context.Context, username, passwordHash string) (*domain.User, error) {
	row := sqlite.UserTable{
		ID:           uuid.New().String(),
		Username:     username,
		PasswordHash: passwordHash,
		CreatedAt:    time.Now().UTC(),
	}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, err
	}
	return &domain.User{ID: row.ID, Username: row.Username, PasswordHash: row.PasswordHash, CreatedAt: row.CreatedAt}, nil
}

func (r *AuthRepo) FindUserByUsername(ctx context.Context, username string) (*domain.User, error) {
	var row sqlite.UserTable
	err := r.db.WithContext(ctx).Where("username = ?", username).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return &domain.User{ID: row.ID, Username: row.Username, PasswordHash: row.PasswordHash, CreatedAt: row.CreatedAt}, nil
}

func (r *AuthRepo) FindUserByID(ctx context.Context, id string) (*domain.User, error) {
	var row sqlite.UserTable
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return &domain.User{ID: row.ID, Username: row.Username, PasswordHash: row.PasswordHash, CreatedAt: row.CreatedAt}, nil
}

func (r *AuthRepo) CreateSession(ctx context.Context, userID string, expiresAt time.Time) (*domain.UserSession, error) {
	row := sqlite.UserSessionTable{
		Token:     uuid.New().String(),
		UserID:    userID,
		ExpiresAt: expiresAt,
	}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, err
	}
	return &domain.UserSession{Token: row.Token, UserID: row.UserID, ExpiresAt: row.ExpiresAt}, nil
}

func (r *AuthRepo) FindSession(ctx context.Context, token string) (*domain.UserSession, error) {
	var row sqlite.UserSessionTable
	err := r.db.WithContext(ctx).Where("token = ? AND expires_at > ?", token, time.Now().UTC()).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrInvalidToken
	}
	if err != nil {
		return nil, err
	}
	return &domain.UserSession{Token: row.Token, UserID: row.UserID, ExpiresAt: row.ExpiresAt}, nil
}

func (r *AuthRepo) DeleteSession(ctx context.Context, token string) error {
	return r.db.WithContext(ctx).Where("token = ?", token).Delete(&sqlite.UserSessionTable{}).Error
}
