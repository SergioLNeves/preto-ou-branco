package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"preto-ou-branco/internal/domain"
)

type GameHandler struct {
	svc domain.GameService
}

func NewGameHandler(svc domain.GameService) *GameHandler {
	return &GameHandler{svc: svc}
}

func (h *GameHandler) RandomQuestions(c echo.Context) error {
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 30
	}
	qs, err := h.svc.ListRandomQuestions(c.Request().Context(), limit)
	if err != nil {
		return domainGameError(err)
	}
	return c.JSON(http.StatusOK, qs)
}

type submitVoteRequest struct {
	QuestionID string `json:"question_id"`
	Choice     string `json:"choice"`
}

func (h *GameHandler) SubmitVote(c echo.Context) error {
	var req submitVoteRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	if req.QuestionID == "" || req.Choice == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "question_id and choice are required")
	}
	res, err := h.svc.SubmitVote(c.Request().Context(), req.QuestionID, req.Choice)
	if err != nil {
		return domainGameError(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h *GameHandler) TodayResults(c echo.Context) error {
	list, err := h.svc.GetDayVotes(c.Request().Context())
	if err != nil {
		return domainGameError(err)
	}
	return c.JSON(http.StatusOK, list)
}

func domainGameError(err error) error {
	switch {
	case errors.Is(err, domain.ErrInvalidChoice), errors.Is(err, domain.ErrInvalidQuestionID):
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	case errors.Is(err, domain.ErrCategoryNotFound), errors.Is(err, domain.ErrQuestionNotFound):
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
}
