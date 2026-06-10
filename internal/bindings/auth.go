package bindings

import (
	"context"

	"preto-ou-branco/internal/domain"
	"preto-ou-branco/internal/service"
)

type AuthApp struct {
	svc *service.AuthService
}

func NewAuthApp(svc *service.AuthService) *AuthApp {
	return &AuthApp{svc: svc}
}

type AuthResult struct {
	Token    string              `json:"token"`
	User     domain.UserResponse `json:"user"`
}

func (a *AuthApp) CreateAccount(username, password string) (*AuthResult, error) {
	user, token, err := a.svc.CreateAccount(context.Background(), username, password)
	if err != nil {
		return nil, err
	}
	return &AuthResult{Token: token, User: *user}, nil
}

func (a *AuthApp) Login(username, password string) (*AuthResult, error) {
	user, token, err := a.svc.Login(context.Background(), username, password)
	if err != nil {
		return nil, err
	}
	return &AuthResult{Token: token, User: *user}, nil
}

func (a *AuthApp) GetMe(token string) (*domain.UserResponse, error) {
	return a.svc.GetMe(context.Background(), token)
}

func (a *AuthApp) Logout(token string) error {
	return a.svc.Logout(context.Background(), token)
}
