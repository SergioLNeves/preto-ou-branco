package middleware

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"preto-ou-branco/internal/domain"
)

// RoomIdentity resolves the caller identity from Bearer token (auth user)
// or X-Guest-Token header (guest). Fails with 401 if neither resolves.
func RoomIdentity(authSvc domain.AuthService, roomRepo domain.RoomRepository) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			bearer := c.Request().Header.Get("Authorization")
			if strings.HasPrefix(bearer, "Bearer ") {
				token := strings.TrimPrefix(bearer, "Bearer ")
				user, err := authSvc.GetMe(c.Request().Context(), token)
				if err == nil {
					c.Set("user_id", user.ID)
					c.Set("username", user.Username)
					return next(c)
				}
			}

			guestToken := c.Request().Header.Get("X-Guest-Token")
			if guestToken != "" {
				p, err := roomRepo.FindParticipantByGuestToken(c.Request().Context(), guestToken)
				if err == nil {
					c.Set("room_participant_id", p.ID)
					c.Set("username", p.Username)
					return next(c)
				}
			}

			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "authentication required"})
		}
	}
}

// OptionalRoomIdentity extracts caller identity if a valid token is present, but never returns 401.
// Use on endpoints that must work for anonymous callers but also benefit from identity when available.
func OptionalRoomIdentity(authSvc domain.AuthService, roomRepo domain.RoomRepository) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			bearer := c.Request().Header.Get("Authorization")
			if strings.HasPrefix(bearer, "Bearer ") {
				token := strings.TrimPrefix(bearer, "Bearer ")
				if user, err := authSvc.GetMe(c.Request().Context(), token); err == nil {
					c.Set("user_id", user.ID)
					c.Set("username", user.Username)
					return next(c)
				}
			}
			guestToken := c.Request().Header.Get("X-Guest-Token")
			if guestToken != "" {
				if p, err := roomRepo.FindParticipantByGuestToken(c.Request().Context(), guestToken); err == nil {
					c.Set("room_participant_id", p.ID)
					c.Set("username", p.Username)
				}
			}
			return next(c)
		}
	}
}

// BearerAuth requires a valid Bearer token (authenticated users only).
func BearerAuth(authSvc domain.AuthService) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			bearer := c.Request().Header.Get("Authorization")
			if !strings.HasPrefix(bearer, "Bearer ") {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "authentication required"})
			}
			token := strings.TrimPrefix(bearer, "Bearer ")
			user, err := authSvc.GetMe(c.Request().Context(), token)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid token"})
			}
			c.Set("user_id", user.ID)
			c.Set("username", user.Username)
			return next(c)
		}
	}
}
