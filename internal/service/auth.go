package service

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode"

	"golang.org/x/crypto/bcrypt"

	"preto-ou-branco/internal/domain"
)

type AuthService struct {
	repo domain.AuthRepository
}

func NewAuthService(repo domain.AuthRepository) *AuthService {
	return &AuthService{repo: repo}
}

func validateUsername(username string) error {
	u := strings.TrimSpace(username)
	if len(u) < 3 || len(u) > 24 {
		return errors.New("username must be 3–24 characters")
	}
	for _, r := range u {
		if !unicode.IsLetter(r) && !unicode.IsDigit(r) && r != '_' && r != '-' {
			return errors.New("username may only contain letters, digits, _ or -")
		}
	}
	return nil
}

func (s *AuthService) CreateAccount(ctx context.Context, username, password string) (*domain.UserResponse, string, error) {
	if err := validateUsername(username); err != nil {
		return nil, "", err
	}
	if len(password) < 6 {
		return nil, "", errors.New("password must be at least 6 characters")
	}
	if _, err := s.repo.FindUserByUsername(ctx, strings.TrimSpace(username)); err == nil {
		return nil, "", domain.ErrUserAlreadyExists
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", err
	}
	user, err := s.repo.CreateUser(ctx, strings.TrimSpace(username), string(hash))
	if err != nil {
		return nil, "", err
	}
	session, err := s.repo.CreateSession(ctx, user.ID, time.Now().Add(30*24*time.Hour))
	if err != nil {
		return nil, "", err
	}
	return &domain.UserResponse{ID: user.ID, Username: user.Username}, session.Token, nil
}

func (s *AuthService) Login(ctx context.Context, username, password string) (*domain.UserResponse, string, error) {
	user, err := s.repo.FindUserByUsername(ctx, strings.TrimSpace(username))
	if errors.Is(err, domain.ErrUserNotFound) {
		return nil, "", domain.ErrInvalidCredentials
	}
	if err != nil {
		return nil, "", err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, "", domain.ErrInvalidCredentials
	}
	session, err := s.repo.CreateSession(ctx, user.ID, time.Now().Add(30*24*time.Hour))
	if err != nil {
		return nil, "", err
	}
	return &domain.UserResponse{ID: user.ID, Username: user.Username}, session.Token, nil
}

func (s *AuthService) GetMe(ctx context.Context, token string) (*domain.UserResponse, error) {
	session, err := s.repo.FindSession(ctx, token)
	if err != nil {
		return nil, err
	}
	user, err := s.repo.FindUserByID(ctx, session.UserID)
	if err != nil {
		return nil, err
	}
	return &domain.UserResponse{ID: user.ID, Username: user.Username}, nil
}

func (s *AuthService) Logout(ctx context.Context, token string) error {
	return s.repo.DeleteSession(ctx, token)
}
