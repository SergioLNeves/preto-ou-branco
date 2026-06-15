package domain

import (
	"context"
	"fmt"
	"time"
)

const MaxRoomParticipants = 32

var (
	ErrRoomNotFound         = fmt.Errorf("room not found")
	ErrRoomFull             = fmt.Errorf("room is full")
	ErrNotHost              = fmt.Errorf("only the host can perform this action")
	ErrPhaseMismatch        = fmt.Errorf("action not allowed in current phase")
	ErrParticipantNotInRoom = fmt.Errorf("participant not in room")
	ErrGameAlreadyStarted   = fmt.Errorf("game already started")
	ErrInvalidChoice        = fmt.Errorf("choice must be 'preto' or 'branco'")
	ErrInvalidUsername      = fmt.Errorf("username must be 1-24 characters")
	ErrNoQuestionsAvailable = fmt.Errorf("no questions available")
)

type RoomPhase string

const (
	PhaseLobby    RoomPhase = "lobby"
	PhasePlaying  RoomPhase = "playing"
	PhaseFinished RoomPhase = "finished"
)

// ChoicePreto and ChoiceBranco are the only valid vote choices.
const (
	ChoicePreto  = "preto"
	ChoiceBranco = "branco"
)

var EmojiPool = []string{
	"🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼",
	"🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔",
	"🦄", "🐲", "🌵", "🌊", "🔥", "⚡", "🌙", "⭐",
	"🍕", "🎸", "🎲", "🚀", "💎", "🎭", "🏆", "🎪",
}

type Room struct {
	ID            string
	HostUserID    string
	QuestionCount int
	Phase         RoomPhase
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type RoomParticipant struct {
	ID          string
	RoomID      string
	UserID      *string
	Username    string
	Emoji       string
	GuestToken  *string
	HasFinished bool
	JoinedAt    time.Time
	LastSeenAt  time.Time
}

type RoomQuestion struct {
	ID           string
	RoomID       string
	QuestionID   string
	QuestionText string
	Order        int
}

type RoomVote struct {
	ID             string
	RoomQuestionID string
	ParticipantID  string
	Choice         string
	CreatedAt      time.Time
}

// DTOs

type CreateRoomRequest struct {
	QuestionCount int `json:"question_count"`
}

type UpdateRoomSettingsRequest struct {
	QuestionCount int `json:"question_count"`
}

type JoinRoomRequest struct {
	RoomID   string `json:"room_id"`
	Username string `json:"username"`
}

type SubmitRoomVoteRequest struct {
	RoomQuestionID string `json:"room_question_id"`
	Choice         string `json:"choice"`
}

type RoomViewer struct {
	UserID        *string
	ParticipantID *string
}

type RoomParticipantResponse struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	Emoji       string `json:"emoji"`
	IsHost      bool   `json:"is_host"`
	HasFinished bool   `json:"has_finished"`
}

type RoomQuestionResponse struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}

type RoomState struct {
	RoomID        string                    `json:"room_id"`
	Phase         RoomPhase                 `json:"phase"`
	QuestionCount int                       `json:"question_count"`
	MyVotedCount  int                       `json:"my_voted_count"`
	Participants  []RoomParticipantResponse `json:"participants"`
	Questions     []RoomQuestionResponse    `json:"questions"`
	MyParticipant RoomParticipantResponse   `json:"my_participant"`
	GuestToken    *string                   `json:"guest_token,omitempty"`
}

type ScoreboardEntry struct {
	ParticipantID string `json:"participant_id"`
	Username      string `json:"username"`
	Emoji         string `json:"emoji"`
	Points        int    `json:"points"`
}

// ResultStep holds per-question outcome data for the animated reveal.
type ResultStep struct {
	QuestionText string         `json:"question_text"`
	PretoCount   int            `json:"preto_count"`
	BrancoCount  int            `json:"branco_count"`
	Outcome      string         `json:"outcome"` // "preto" | "branco" | "tie"
	Points       map[string]int `json:"points"`  // participant_id → points earned this question
}

type RoomResults struct {
	RoomID     string            `json:"room_id"`
	Scoreboard []ScoreboardEntry `json:"scoreboard"`
	Steps      []ResultStep      `json:"steps"`
}

type RoomService interface {
	CreateRoom(ctx context.Context, hostUserID, hostUsername string, req CreateRoomRequest) (*RoomState, error)
	UpdateRoomSettings(ctx context.Context, roomID, hostUserID string, req UpdateRoomSettingsRequest) error
	CloseRoom(ctx context.Context, roomID, hostUserID string) error
	JoinRoom(ctx context.Context, req JoinRoomRequest, viewer RoomViewer) (*RoomState, error)
	StartGame(ctx context.Context, roomID, hostUserID string) error
	SubmitVote(ctx context.Context, roomID string, req SubmitRoomVoteRequest, viewer RoomViewer) (*RoomState, error)
	RestartRoom(ctx context.Context, roomID, hostUserID string) error
	GetRoomState(ctx context.Context, roomID string, viewer RoomViewer) (*RoomState, error)
	GetResults(ctx context.Context, roomID string) (*RoomResults, error)
}

type RoomRepository interface {
	CreateRoom(ctx context.Context, room *Room) error
	FindRoomByID(ctx context.Context, id string) (*Room, error)
	UpdateRoom(ctx context.Context, room *Room) error
	UpdateRoomQuestionCount(ctx context.Context, roomID string, count int) error
	DeleteRoom(ctx context.Context, roomID string) error
	CountParticipants(ctx context.Context, roomID string) (int, error)
	AddParticipant(ctx context.Context, p *RoomParticipant) error
	UpdateParticipant(ctx context.Context, p *RoomParticipant) error
	FindParticipantByGuestToken(ctx context.Context, token string) (*RoomParticipant, error)
	FindParticipantByUserAndRoom(ctx context.Context, userID, roomID string) (*RoomParticipant, error)
	FindParticipantByID(ctx context.Context, id string) (*RoomParticipant, error)
	ListParticipants(ctx context.Context, roomID string) ([]RoomParticipant, error)
	ResetParticipantsFinished(ctx context.Context, roomID string) error
	SnapshotQuestions(ctx context.Context, roomID string, questions []QuestionResponse) error
	ListRoomQuestions(ctx context.Context, roomID string) ([]RoomQuestion, error)
	FindRoomQuestion(ctx context.Context, id string) (*RoomQuestion, error)
	DeleteRoomQuestions(ctx context.Context, roomID string) error
	UpsertVote(ctx context.Context, vote *RoomVote) error
	CountVotesByParticipant(ctx context.Context, participantID, roomID string) (int, error)
	ListVotesForQuestion(ctx context.Context, roomQuestionID string) ([]RoomVote, error)
	ComputeScoreboard(ctx context.Context, roomID string) ([]ScoreboardEntry, error)
	ComputeResultSteps(ctx context.Context, roomID string) ([]ResultStep, error)
	FinishRoom(ctx context.Context, roomID string) (bool, error)
	Transaction(ctx context.Context, fn func(repo RoomRepository) error) error
}
