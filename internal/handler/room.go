package handler

import (
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"

	"preto-ou-branco/internal/domain"
	"preto-ou-branco/internal/realtime"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type RoomHandler struct {
	svc domain.RoomService
	hub *realtime.Hub
}

func NewRoomHandler(svc domain.RoomService, hub *realtime.Hub) *RoomHandler {
	return &RoomHandler{svc: svc, hub: hub}
}

func viewerFromCtx(c echo.Context) domain.RoomViewer {
	viewer := domain.RoomViewer{}
	if uid, ok := c.Get("user_id").(string); ok && uid != "" {
		viewer.UserID = &uid
	}
	if pid, ok := c.Get("room_participant_id").(string); ok && pid != "" {
		viewer.ParticipantID = &pid
	}
	return viewer
}

func (h *RoomHandler) CreateRoom(c echo.Context) error {
	hostUserID := c.Get("user_id").(string)
	hostUsername := c.Get("username").(string)
	var req domain.CreateRoomRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
	state, err := h.svc.CreateRoom(c.Request().Context(), hostUserID, hostUsername, req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, state)
}

func (h *RoomHandler) JoinRoom(c echo.Context) error {
	var req domain.JoinRoomRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
	viewer := viewerFromCtx(c)
	state, err := h.svc.JoinRoom(c.Request().Context(), req, viewer)
	if err != nil {
		status := http.StatusBadRequest
		if err == domain.ErrRoomFull {
			status = http.StatusConflict
		} else if err == domain.ErrRoomCodeInvalid {
			status = http.StatusNotFound
		} else if err == domain.ErrGameAlreadyStarted {
			status = http.StatusForbidden
		}
		return c.JSON(status, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, state)
}

func (h *RoomHandler) CloseRoom(c echo.Context) error {
	roomID := c.Param("id")
	hostUserID := c.Get("user_id").(string)
	if err := h.svc.CloseRoom(c.Request().Context(), roomID, hostUserID); err != nil {
		status := http.StatusBadRequest
		if err == domain.ErrNotHost {
			status = http.StatusForbidden
		} else if err == domain.ErrPhaseMismatch {
			status = http.StatusConflict
		}
		return c.JSON(status, map[string]string{"error": err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *RoomHandler) UpdateRoomSettings(c echo.Context) error {
	roomID := c.Param("id")
	hostUserID := c.Get("user_id").(string)
	var req domain.UpdateRoomSettingsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
	if err := h.svc.UpdateRoomSettings(c.Request().Context(), roomID, hostUserID, req); err != nil {
		status := http.StatusBadRequest
		if err == domain.ErrNotHost {
			status = http.StatusForbidden
		} else if err == domain.ErrPhaseMismatch {
			status = http.StatusConflict
		}
		return c.JSON(status, map[string]string{"error": err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *RoomHandler) StartRoom(c echo.Context) error {
	roomID := c.Param("id")
	hostUserID := c.Get("user_id").(string)
	if err := h.svc.StartGame(c.Request().Context(), roomID, hostUserID); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *RoomHandler) GetRoomState(c echo.Context) error {
	roomID := c.Param("id")
	viewer := viewerFromCtx(c)
	state, err := h.svc.GetRoomState(c.Request().Context(), roomID, viewer)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, state)
}

func (h *RoomHandler) SubmitRoomVote(c echo.Context) error {
	roomID := c.Param("id")
	var req domain.SubmitRoomVoteRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
	viewer := viewerFromCtx(c)
	state, err := h.svc.SubmitVote(c.Request().Context(), roomID, req, viewer)
	if err != nil {
		status := http.StatusBadRequest
		if err == domain.ErrPhaseMismatch {
			status = http.StatusConflict
		}
		return c.JSON(status, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, state)
}

func (h *RoomHandler) ForceAdvanceReveal(c echo.Context) error {
	roomID := c.Param("id")
	hostUserID := c.Get("user_id").(string)
	if err := h.svc.ForceAdvanceReveal(c.Request().Context(), roomID, hostUserID); err != nil {
		status := http.StatusBadRequest
		if err == domain.ErrHostOverrideLocked {
			status = http.StatusTooEarly
		}
		return c.JSON(status, map[string]string{"error": err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *RoomHandler) GetRoomResults(c echo.Context) error {
	roomID := c.Param("id")
	results, err := h.svc.GetResults(c.Request().Context(), roomID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, results)
}

func (h *RoomHandler) WebSocketConnect(c echo.Context) error {
	roomID := c.Param("id")
	participantID := ""
	if pid, ok := c.Get("room_participant_id").(string); ok {
		participantID = pid
	} else if uid, ok := c.Get("user_id").(string); ok {
		participantID = uid
	}

	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}

	client := realtime.NewClient(h.hub, conn, roomID, participantID)
	h.hub.Register(client)
	go client.WritePump()
	client.ReadPump()
	return nil
}
