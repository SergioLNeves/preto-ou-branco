package domain

import (
	"context"
	"fmt"
	"time"
)

var (
	ErrUserNotFound       = fmt.Errorf("user not found")
	ErrUserAlreadyExists  = fmt.Errorf("username already taken")
	ErrInvalidCredentials = fmt.Errorf("invalid credentials")
	ErrInvalidToken       = fmt.Errorf("invalid or expired token")
)

type User struct {
	ID           string
	Username     string
	PasswordHash string
	CreatedAt    time.Time
}

type UserSession struct {
	Token     string
	UserID    string
	ExpiresAt time.Time
}

type UserResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
}

type AuthService interface {
	CreateAccount(ctx context.Context, username, password string) (*UserResponse, string, error)
	Login(ctx context.Context, username, password string) (*UserResponse, string, error)
	GetMe(ctx context.Context, token string) (*UserResponse, error)
	Logout(ctx context.Context, token string) error
}

type AuthRepository interface {
	CreateUser(ctx context.Context, username, passwordHash string) (*User, error)
	FindUserByUsername(ctx context.Context, username string) (*User, error)
	FindUserByID(ctx context.Context, id string) (*User, error)
	CreateSession(ctx context.Context, userID string, expiresAt time.Time) (*UserSession, error)
	FindSession(ctx context.Context, token string) (*UserSession, error)
	DeleteSession(ctx context.Context, token string) error
}
