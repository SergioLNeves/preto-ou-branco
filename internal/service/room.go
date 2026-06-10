package service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"preto-ou-branco/internal/domain"
)

type RoomService struct {
	repo    domain.RoomRepository
	gameSvc domain.GameService
	hub     RoomHub
}

// RoomHub is implemented by the realtime hub to broadcast events.
type RoomHub interface {
	Broadcast(roomID string, event any)
}

func NewRoomService(repo domain.RoomRepository, gameSvc domain.GameService, hub RoomHub) *RoomService {
	return &RoomService{repo: repo, gameSvc: gameSvc, hub: hub}
}

func (s *RoomService) resolveParticipant(ctx context.Context, roomID string, viewer domain.RoomViewer) (*domain.RoomParticipant, error) {
	if viewer.ParticipantID != nil {
		return s.repo.FindParticipantByID(ctx, *viewer.ParticipantID)
	}
	if viewer.UserID != nil {
		return s.repo.FindParticipantByUserAndRoom(ctx, *viewer.UserID, roomID)
	}
	return nil, domain.ErrParticipantNotInRoom
}

func (s *RoomService) buildState(ctx context.Context, room *domain.Room, viewer domain.RoomViewer) (*domain.RoomState, error) {
	participants, err := s.repo.ListParticipants(ctx, room.ID)
	if err != nil {
		return nil, err
	}
	questions, err := s.repo.ListRoomQuestions(ctx, room.ID)
	if err != nil {
		return nil, err
	}

	me, _ := s.resolveParticipant(ctx, room.ID, viewer)

	pResp := make([]domain.RoomParticipantResponse, len(participants))
	for i, p := range participants {
		pResp[i] = domain.RoomParticipantResponse{
			ID:          p.ID,
			Username:    p.Username,
			Emoji:       p.Emoji,
			IsHost:      p.UserID != nil && *p.UserID == room.HostUserID,
			HasFinished: p.HasFinished,
		}
	}

	qResp := make([]domain.RoomQuestionResponse, len(questions))
	for i, q := range questions {
		qResp[i] = domain.RoomQuestionResponse{ID: q.ID, Text: q.QuestionText}
	}

	myVotedCount := 0
	var myPart domain.RoomParticipantResponse
	if me != nil {
		myVotedCount, _ = s.repo.CountVotesByParticipant(ctx, me.ID, room.ID)
		myPart = domain.RoomParticipantResponse{
			ID:          me.ID,
			Username:    me.Username,
			Emoji:       me.Emoji,
			IsHost:      me.UserID != nil && *me.UserID == room.HostUserID,
			HasFinished: me.HasFinished,
		}
	}

	return &domain.RoomState{
		RoomID:               room.ID,
		Phase:                room.Phase,
		QuestionCount:        room.QuestionCount,
		MyVotedCount:         myVotedCount,
		Participants:         pResp,
		Questions:            qResp,
		MyParticipant:        myPart,
		WaitingDeadline:      room.WaitingDeadline,
		HostOverrideUnlockAt: room.HostOverrideUnlockAt,
	}, nil
}

func (s *RoomService) CloseRoom(ctx context.Context, roomID, hostUserID string) error {
	room, err := s.repo.FindRoomByID(ctx, roomID)
	if err != nil {
		return err
	}
	if room.HostUserID != hostUserID {
		return domain.ErrNotHost
	}
	if room.Phase == domain.PhasePlaying || room.Phase == domain.PhaseWaiting {
		return domain.ErrPhaseMismatch
	}
	s.hub.Broadcast(roomID, map[string]any{"type": "room_closed"})
	return s.repo.DeleteRoom(ctx, roomID)
}

var validQuestionCounts = map[int]bool{3: true, 10: true, 20: true, 30: true, 50: true}

func (s *RoomService) UpdateRoomSettings(ctx context.Context, roomID, hostUserID string, req domain.UpdateRoomSettingsRequest) error {
	room, err := s.repo.FindRoomByID(ctx, roomID)
	if err != nil {
		return err
	}
	if room.HostUserID != hostUserID {
		return domain.ErrNotHost
	}
	if room.Phase != domain.PhaseLobby {
		return domain.ErrPhaseMismatch
	}
	if !validQuestionCounts[req.QuestionCount] {
		req.QuestionCount = 10
	}
	if err := s.repo.UpdateRoomQuestionCount(ctx, roomID, req.QuestionCount); err != nil {
		return err
	}
	s.hub.Broadcast(roomID, map[string]any{
		"type":    "settings_updated",
		"payload": map[string]any{"question_count": req.QuestionCount},
	})
	return nil
}

func (s *RoomService) CreateRoom(ctx context.Context, hostUserID, hostUsername string, req domain.CreateRoomRequest) (*domain.RoomState, error) {
	if !validQuestionCounts[req.QuestionCount] {
		req.QuestionCount = 10
	}

	now := time.Now().UTC()
	room := &domain.Room{
		ID:            uuid.New().String(),
		HostUserID:    hostUserID,
		QuestionCount: req.QuestionCount,
		Phase:         domain.PhaseLobby,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := s.repo.CreateRoom(ctx, room); err != nil {
		return nil, err
	}

	questions, err := s.gameSvc.ListRandomQuestions(ctx, req.QuestionCount)
	if err != nil {
		return nil, err
	}
	if err := s.repo.SnapshotQuestions(ctx, room.ID, questions); err != nil {
		return nil, err
	}

	count, _ := s.repo.CountParticipants(ctx, room.ID)
	emoji := domain.EmojiPool[count%len(domain.EmojiPool)]
	p := &domain.RoomParticipant{
		ID:         uuid.New().String(),
		RoomID:     room.ID,
		UserID:     &hostUserID,
		Username:   hostUsername,
		Emoji:      emoji,
		JoinedAt:   now,
		LastSeenAt: now,
	}
	if err := s.repo.AddParticipant(ctx, p); err != nil {
		return nil, err
	}

	viewer := domain.RoomViewer{UserID: &hostUserID}
	return s.buildState(ctx, room, viewer)
}

func (s *RoomService) JoinRoom(ctx context.Context, req domain.JoinRoomRequest, viewer domain.RoomViewer) (*domain.RoomState, error) {
	room, err := s.repo.FindRoomByID(ctx, req.RoomID)
	if err != nil {
		return nil, domain.ErrRoomNotFound
	}

	// Reconnect: authenticated user
	if viewer.UserID != nil {
		if existing, err := s.repo.FindParticipantByUserAndRoom(ctx, *viewer.UserID, room.ID); err == nil {
			state, err := s.buildState(ctx, room, viewer)
			if err != nil {
				return nil, err
			}
			state.GuestToken = existing.GuestToken
			return state, nil
		}
	}

	// Reconnect: guest by token
	if viewer.ParticipantID != nil {
		if existing, err := s.repo.FindParticipantByID(ctx, *viewer.ParticipantID); err == nil && existing.RoomID == room.ID {
			return s.buildState(ctx, room, viewer)
		}
	}

	if room.Phase != domain.PhaseLobby {
		return nil, domain.ErrGameAlreadyStarted
	}

	count, err := s.repo.CountParticipants(ctx, room.ID)
	if err != nil {
		return nil, err
	}
	if count >= domain.MaxRoomParticipants {
		return nil, domain.ErrRoomFull
	}

	now := time.Now().UTC()
	emoji := domain.EmojiPool[count%len(domain.EmojiPool)]

	p := &domain.RoomParticipant{
		ID:         uuid.New().String(),
		RoomID:     room.ID,
		Username:   req.Username,
		Emoji:      emoji,
		JoinedAt:   now,
		LastSeenAt: now,
	}

	var guestToken *string
	if viewer.UserID != nil {
		p.UserID = viewer.UserID
	} else {
		t := uuid.New().String()
		guestToken = &t
		p.GuestToken = guestToken
	}

	if err := s.repo.AddParticipant(ctx, p); err != nil {
		return nil, err
	}

	viewer2 := domain.RoomViewer{UserID: p.UserID}
	if viewer.UserID == nil {
		viewer2 = domain.RoomViewer{ParticipantID: &p.ID}
	}

	s.hub.Broadcast(room.ID, map[string]any{"type": "participant_joined", "payload": map[string]any{
		"id": p.ID, "username": p.Username, "emoji": p.Emoji,
	}})

	state, err := s.buildState(ctx, room, viewer2)
	if err != nil {
		return nil, err
	}
	state.GuestToken = guestToken
	return state, nil
}

func (s *RoomService) StartGame(ctx context.Context, roomID, hostUserID string) error {
	room, err := s.repo.FindRoomByID(ctx, roomID)
	if err != nil {
		return err
	}
	if room.HostUserID != hostUserID {
		return domain.ErrNotHost
	}
	if room.Phase != domain.PhaseLobby {
		return domain.ErrPhaseMismatch
	}
	room.Phase = domain.PhasePlaying
	if err := s.repo.UpdateRoom(ctx, room); err != nil {
		return err
	}
	s.hub.Broadcast(roomID, map[string]any{"type": "phase_changed", "payload": map[string]any{"phase": "playing"}})
	return nil
}

func (s *RoomService) SubmitVote(ctx context.Context, roomID string, req domain.SubmitRoomVoteRequest, viewer domain.RoomViewer) (*domain.RoomState, error) {
	room, err := s.repo.FindRoomByID(ctx, roomID)
	if err != nil {
		return nil, err
	}
	if room.Phase != domain.PhasePlaying {
		return nil, domain.ErrPhaseMismatch
	}

	me, err := s.resolveParticipant(ctx, roomID, viewer)
	if err != nil {
		return nil, err
	}

	rq, err := s.repo.FindRoomQuestion(ctx, req.RoomQuestionID)
	if err != nil || rq.RoomID != roomID {
		return nil, domain.ErrRoomNotFound
	}

	vote := &domain.RoomVote{
		ID:             uuid.New().String(),
		RoomQuestionID: req.RoomQuestionID,
		ParticipantID:  me.ID,
		Choice:         req.Choice,
	}
	if err := s.repo.UpsertVote(ctx, vote); err != nil {
		return nil, err
	}

	votedCount, _ := s.repo.CountVotesByParticipant(ctx, me.ID, roomID)
	if votedCount >= room.QuestionCount && !me.HasFinished {
		me.HasFinished = true
		_ = s.repo.UpdateParticipant(ctx, me)
	}

	participants, _ := s.repo.ListParticipants(ctx, roomID)
	finishedCount := 0
	for _, p := range participants {
		if p.HasFinished {
			finishedCount++
		}
	}

	s.hub.Broadcast(roomID, map[string]any{"type": "vote_progress", "payload": map[string]any{
		"finished_count": finishedCount, "total": len(participants),
	}})

	if finishedCount == len(participants) {
		s.transitionToFinished(ctx, room)
	}

	return s.buildState(ctx, room, viewer)
}

func (s *RoomService) transitionToFinished(ctx context.Context, room *domain.Room) {
	room.Phase = domain.PhaseFinished
	_ = s.repo.UpdateRoom(ctx, room)
	scoreboard, _ := s.repo.ComputeScoreboard(ctx, room.ID)
	s.hub.Broadcast(room.ID, map[string]any{"type": "game_finished", "payload": scoreboard})
}

func (s *RoomService) ForceAdvanceReveal(ctx context.Context, roomID, hostUserID string) error {
	room, err := s.repo.FindRoomByID(ctx, roomID)
	if err != nil {
		return err
	}
	if room.HostUserID != hostUserID {
		return domain.ErrNotHost
	}
	if room.Phase != domain.PhaseWaiting {
		return domain.ErrPhaseMismatch
	}
	if room.HostOverrideUnlockAt != nil && time.Now().UTC().Before(*room.HostOverrideUnlockAt) {
		return domain.ErrHostOverrideLocked
	}
	s.transitionToFinished(ctx, room)
	return nil
}

func (s *RoomService) RestartRoom(ctx context.Context, roomID, hostUserID string) error {
	room, err := s.repo.FindRoomByID(ctx, roomID)
	if err != nil {
		return err
	}
	if room.HostUserID != hostUserID {
		return domain.ErrNotHost
	}
	if room.Phase != domain.PhaseFinished {
		return domain.ErrPhaseMismatch
	}

	if err := s.repo.DeleteRoomQuestions(ctx, roomID); err != nil {
		return err
	}

	questions, err := s.gameSvc.ListRandomQuestions(ctx, room.QuestionCount)
	if err != nil {
		return err
	}
	if err := s.repo.SnapshotQuestions(ctx, roomID, questions); err != nil {
		return err
	}

	if err := s.repo.ResetParticipantsFinished(ctx, roomID); err != nil {
		return err
	}

	room.Phase = domain.PhaseLobby
	room.WaitingDeadline = nil
	room.HostOverrideUnlockAt = nil
	if err := s.repo.UpdateRoom(ctx, room); err != nil {
		return err
	}

	s.hub.Broadcast(roomID, map[string]any{"type": "phase_changed", "payload": map[string]any{"phase": "lobby"}})
	return nil
}

func (s *RoomService) GetRoomState(ctx context.Context, roomID string, viewer domain.RoomViewer) (*domain.RoomState, error) {
	room, err := s.repo.FindRoomByID(ctx, roomID)
	if err != nil {
		return nil, err
	}
	return s.buildState(ctx, room, viewer)
}

func (s *RoomService) GetResults(ctx context.Context, roomID string) (*domain.RoomResults, error) {
	scoreboard, err := s.repo.ComputeScoreboard(ctx, roomID)
	if err != nil {
		return nil, err
	}
	steps, err := s.repo.ComputeResultSteps(ctx, roomID)
	if err != nil {
		return nil, err
	}
	return &domain.RoomResults{RoomID: roomID, Scoreboard: scoreboard, Steps: steps}, nil
}

func (s *RoomService) Tick(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			rooms, err := s.repo.ListActiveWaitingRooms(ctx)
			if err != nil {
				continue
			}
			for _, room := range rooms {
				if room.WaitingDeadline != nil && time.Now().UTC().After(*room.WaitingDeadline) {
					s.transitionToFinished(ctx, &room)
				}
			}
		}
	}
}
