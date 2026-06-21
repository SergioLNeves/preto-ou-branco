package handler

import (
	"context"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"preto-ou-branco/internal/storage/sqlite"
)

// UpdateFunc performs a remote catalog update from the given base URL and
// returns the number of questions added, removed, and skipped.
type UpdateFunc func(ctx context.Context, baseURL string) (sqlite.ReconcileResult, error)

// GameDataHandler exposes the catalog update endpoint.
type GameDataHandler struct {
	update UpdateFunc
}

func NewGameDataHandler(update UpdateFunc) *GameDataHandler {
	return &GameDataHandler{update: update}
}

type updateGameDataRequest struct {
	URL string `json:"url"`
}

// UpdateGameData handles POST /v1/gamedata/update.
// Body: { "url": "https://raw.githubusercontent.com/..." }
func (h *GameDataHandler) UpdateGameData(c echo.Context) error {
	var req updateGameDataRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	req.URL = strings.TrimRight(strings.TrimSpace(req.URL), "/")
	if req.URL == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "url is required")
	}

	result, err := h.update(c.Request().Context(), req.URL)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadGateway, err.Error())
	}
	return c.JSON(http.StatusOK, map[string]int{
		"added":   result.Added,
		"removed": result.Removed,
		"skipped": result.Skipped,
	})
}
