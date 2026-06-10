package handler

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"preto-ou-branco/internal/domain"
)

type AuthHandler struct {
	svc domain.AuthService
}

func NewAuthHandler(svc domain.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

type authCredentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type authResponse struct {
	Token string              `json:"token"`
	User  domain.UserResponse `json:"user"`
}

func (h *AuthHandler) Register(c echo.Context) error {
	var req authCredentials
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	user, token, err := h.svc.CreateAccount(c.Request().Context(), req.Username, req.Password)
	if err != nil {
		return domainAuthError(err)
	}
	return c.JSON(http.StatusCreated, authResponse{Token: token, User: *user})
}

func (h *AuthHandler) Login(c echo.Context) error {
	var req authCredentials
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	user, token, err := h.svc.Login(c.Request().Context(), req.Username, req.Password)
	if err != nil {
		return domainAuthError(err)
	}
	return c.JSON(http.StatusOK, authResponse{Token: token, User: *user})
}

func (h *AuthHandler) Me(c echo.Context) error {
	token := bearerToken(c)
	if token == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing token")
	}
	user, err := h.svc.GetMe(c.Request().Context(), token)
	if err != nil {
		return domainAuthError(err)
	}
	return c.JSON(http.StatusOK, user)
}

func (h *AuthHandler) Logout(c echo.Context) error {
	token := bearerToken(c)
	if token == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing token")
	}
	if err := h.svc.Logout(c.Request().Context(), token); err != nil {
		return domainAuthError(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func bearerToken(c echo.Context) string {
	h := c.Request().Header.Get("Authorization")
	after, found := strings.CutPrefix(h, "Bearer ")
	if !found {
		return ""
	}
	return after
}

func domainAuthError(err error) error {
	switch err {
	case domain.ErrInvalidCredentials:
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	case domain.ErrUserAlreadyExists:
		return echo.NewHTTPError(http.StatusConflict, err.Error())
	case domain.ErrUserNotFound, domain.ErrInvalidToken:
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
}
