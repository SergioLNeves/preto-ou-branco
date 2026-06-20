package service

import (
	"context"
	"strings"
	"time"
	"unicode/utf8"

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
		RoomID:        room.ID,
		Phase:         room.Phase,
		QuestionCount: room.QuestionCount,
		Difficulty:    room.Difficulty,
		MyVotedCount:  myVotedCount,
		Participants:  pResp,
		Questions:     qResp,
		MyParticipant: myPart,
	}, nil
}

// validateGuestUsername enforces the same length limit as domain.ErrInvalidUsername
// (1-24 characters, rune-aware) while remaining permissive about charset —
// guests pick free-form display names, unlike registered account usernames.
func validateGuestUsername(username string) error {
	u := strings.TrimSpace(username)
	count := utf8.RuneCountInString(u)
	if count < 1 || count > 24 {
		return domain.ErrInvalidUsername
	}
	return nil
}

func (s *RoomService) CloseRoom(ctx context.Context, roomID, hostUserID string) error {
	room, err := s.repo.FindRoomByID(ctx, roomID)
	if err != nil {
		return err
	}
	if room.HostUserID != hostUserID {
		return domain.ErrNotHost
	}
	s.hub.Broadcast(roomID, map[string]any{"type": "room_closed"})
	return s.repo.DeleteRoom(ctx, roomID)
}

var validQuestionCounts = map[int]bool{3: true, 10: true, 20: true, 30: true, 50: true}

func normalizeDifficulty(d string) domain.RoomDifficulty {
	diff := domain.RoomDifficulty(d)
	if domain.ValidDifficulties[diff] {
		return diff
	}
	return domain.DifficultyLeve
}

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

	// Resolve new settings: fall back to current values when fields are absent.
	newCount := req.QuestionCount
	if !validQuestionCounts[newCount] {
		newCount = room.QuestionCount
	}
	newDiff := normalizeDifficulty(req.Difficulty)
	if req.Difficulty == "" {
		newDiff = room.Difficulty
	}

	// Re-select and snapshot questions for the updated settings.
	questions, err := s.gameSvc.ListRandomQuestions(ctx, newCount, string(newDiff))
	if err != nil {
		return err
	}
	if len(questions) == 0 {
		return domain.ErrNoQuestionsAvailable
	}

	err = s.repo.Transaction(ctx, func(repo domain.RoomRepository) error {
		if err := repo.DeleteRoomQuestions(ctx, roomID); err != nil {
			return err
		}
		if err := repo.SnapshotQuestions(ctx, roomID, questions); err != nil {
			return err
		}
		return repo.UpdateRoomSettings(ctx, roomID, newCount, newDiff)
	})
	if err != nil {
		return err
	}

	s.hub.Broadcast(roomID, map[string]any{
		"type":    "settings_updated",
		"payload": map[string]any{"question_count": newCount, "difficulty": string(newDiff)},
	})
	return nil
}

func (s *RoomService) CreateRoom(ctx context.Context, hostUserID, hostUsername string, req domain.CreateRoomRequest) (*domain.RoomState, error) {
	if !validQuestionCounts[req.QuestionCount] {
		req.QuestionCount = 10
	}
	difficulty := normalizeDifficulty(req.Difficulty)

	questions, err := s.gameSvc.ListRandomQuestions(ctx, req.QuestionCount, string(difficulty))
	if err != nil {
		return nil, err
	}
	if len(questions) == 0 {
		return nil, domain.ErrNoQuestionsAvailable
	}

	now := time.Now().UTC()
	room := &domain.Room{
		ID:            uuid.New().String(),
		HostUserID:    hostUserID,
		QuestionCount: req.QuestionCount,
		Difficulty:    difficulty,
		Phase:         domain.PhaseLobby,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	err = s.repo.Transaction(ctx, func(repo domain.RoomRepository) error {
		if err := repo.CreateRoom(ctx, room); err != nil {
			return err
		}
		if err := repo.SnapshotQuestions(ctx, room.ID, questions); err != nil {
			return err
		}
		hostEmoji := req.Emoji
		if hostEmoji == "" {
			hostEmoji = domain.EmojiPool[0]
		}
		p := &domain.RoomParticipant{
			ID:         uuid.New().String(),
			RoomID:     room.ID,
			UserID:     &hostUserID,
			Username:   hostUsername,
			Emoji:      hostEmoji,
			JoinedAt:   now,
			LastSeenAt: now,
		}
		return repo.AddParticipant(ctx, p)
	})
	if err != nil {
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

	if err := validateGuestUsername(req.Username); err != nil {
		return nil, err
	}

	count, err := s.repo.CountParticipants(ctx, room.ID)
	if err != nil {
		return nil, err
	}
	if count >= domain.MaxRoomParticipants {
		return nil, domain.ErrRoomFull
	}

	now := time.Now().UTC()
	emoji := req.Emoji
	if emoji == "" {
		emoji = domain.EmojiPool[count%len(domain.EmojiPool)]
	}

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

	if req.Choice != domain.ChoicePreto && req.Choice != domain.ChoiceBranco {
		return nil, domain.ErrInvalidChoice
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

	questions, err := s.repo.ListRoomQuestions(ctx, roomID)
	if err != nil {
		return nil, err
	}

	votedCount, _ := s.repo.CountVotesByParticipant(ctx, me.ID, roomID)
	if votedCount >= len(questions) && !me.HasFinished {
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

// transitionToFinished moves the room to "finished" via a conditional UPDATE
// (phase != 'finished'), so concurrent callers (e.g. two participants
// submitting their final vote at the same time) only trigger a single
// game_finished broadcast.
func (s *RoomService) transitionToFinished(ctx context.Context, room *domain.Room) {
	changed, err := s.repo.FinishRoom(ctx, room.ID)
	if err != nil || !changed {
		return
	}
	room.Phase = domain.PhaseFinished
	scoreboard, _ := s.repo.ComputeScoreboard(ctx, room.ID)
	s.hub.Broadcast(room.ID, map[string]any{"type": "game_finished", "payload": scoreboard})
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

	questions, err := s.gameSvc.ListRandomQuestions(ctx, room.QuestionCount, string(room.Difficulty))
	if err != nil {
		return err
	}
	if len(questions) == 0 {
		return domain.ErrNoQuestionsAvailable
	}

	room.Phase = domain.PhaseLobby

	err = s.repo.Transaction(ctx, func(repo domain.RoomRepository) error {
		if err := repo.DeleteRoomQuestions(ctx, roomID); err != nil {
			return err
		}
		if err := repo.SnapshotQuestions(ctx, roomID, questions); err != nil {
			return err
		}
		if err := repo.ResetParticipantsFinished(ctx, roomID); err != nil {
			return err
		}
		return repo.UpdateRoom(ctx, room)
	})
	if err != nil {
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
