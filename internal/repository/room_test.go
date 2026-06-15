package repository_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"preto-ou-branco/internal/domain"
	"preto-ou-branco/internal/repository"
	"preto-ou-branco/internal/storage/sqlite"
)

func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "test.db")
	db, err := sqlite.OpenAt(dbPath)
	if err != nil {
		t.Fatalf("OpenAt: %v", err)
	}
	return db
}

// seedRoomWithVote creates a room with one participant, one snapshotted
// question and one vote, returning the room ID. Used to exercise FK cascade
// on delete and the FinishRoom transition.
func seedRoomWithVote(t *testing.T, db *gorm.DB) string {
	t.Helper()
	ctx := context.Background()
	repo := repository.NewRoomRepo(db)

	roomID := uuid.New().String()
	room := &domain.Room{
		ID:            roomID,
		HostUserID:    uuid.New().String(),
		QuestionCount: 1,
		Phase:         domain.PhaseLobby,
		CreatedAt:     time.Now().UTC(),
		UpdatedAt:     time.Now().UTC(),
	}
	if err := repo.CreateRoom(ctx, room); err != nil {
		t.Fatalf("CreateRoom: %v", err)
	}

	participant := &domain.RoomParticipant{
		ID:         uuid.New().String(),
		RoomID:     roomID,
		Username:   "host",
		Emoji:      "🐶",
		JoinedAt:   time.Now().UTC(),
		LastSeenAt: time.Now().UTC(),
	}
	if err := repo.AddParticipant(ctx, participant); err != nil {
		t.Fatalf("AddParticipant: %v", err)
	}

	if err := repo.SnapshotQuestions(ctx, roomID, []domain.QuestionResponse{
		{ID: uuid.New().String(), CategoryID: uuid.New().String(), Text: "Pergunta?"},
	}); err != nil {
		t.Fatalf("SnapshotQuestions: %v", err)
	}

	questions, err := repo.ListRoomQuestions(ctx, roomID)
	if err != nil || len(questions) != 1 {
		t.Fatalf("ListRoomQuestions: %v (len=%d)", err, len(questions))
	}

	if err := repo.UpsertVote(ctx, &domain.RoomVote{
		ID:             uuid.New().String(),
		RoomQuestionID: questions[0].ID,
		ParticipantID:  participant.ID,
		Choice:         string(domain.ChoicePreto),
	}); err != nil {
		t.Fatalf("UpsertVote: %v", err)
	}

	return roomID
}

// TestDeleteRoomCascades verifies that deleting a room cascades to its
// participants, snapshotted questions and votes (FK + ON DELETE CASCADE,
// enabled via "_pragma=foreign_keys(1)" in the DSN).
func TestDeleteRoomCascades(t *testing.T) {
	db := newTestDB(t)
	ctx := context.Background()
	repo := repository.NewRoomRepo(db)

	roomID := seedRoomWithVote(t, db)

	if err := repo.DeleteRoom(ctx, roomID); err != nil {
		t.Fatalf("DeleteRoom: %v", err)
	}

	var participantCount, questionCount, voteCount int64
	if err := db.Table("room_participant").Where("room_id = ?", roomID).Count(&participantCount).Error; err != nil {
		t.Fatalf("count room_participant: %v", err)
	}
	if err := db.Table("room_question").Where("room_id = ?", roomID).Count(&questionCount).Error; err != nil {
		t.Fatalf("count room_question: %v", err)
	}
	if err := db.Table("room_vote").
		Joins("JOIN room_participant ON room_participant.id = room_vote.participant_id").
		Where("room_participant.room_id = ?", roomID).
		Count(&voteCount).Error; err != nil {
		t.Fatalf("count room_vote: %v", err)
	}

	if participantCount != 0 {
		t.Errorf("expected 0 participants after delete, got %d", participantCount)
	}
	if questionCount != 0 {
		t.Errorf("expected 0 room_questions after delete, got %d", questionCount)
	}
	if voteCount != 0 {
		t.Errorf("expected 0 room_votes after delete, got %d", voteCount)
	}
}

// TestFinishRoomIsIdempotent verifies that FinishRoom only reports a change
// (and thus only triggers a "game_finished" broadcast) the first time a room
// transitions to "finished" — concurrent callers racing on the final vote
// must not both broadcast.
func TestFinishRoomIsIdempotent(t *testing.T) {
	db := newTestDB(t)
	ctx := context.Background()
	repo := repository.NewRoomRepo(db)

	roomID := seedRoomWithVote(t, db)

	changed, err := repo.FinishRoom(ctx, roomID)
	if err != nil {
		t.Fatalf("FinishRoom (1st): %v", err)
	}
	if !changed {
		t.Errorf("expected first FinishRoom call to report changed=true")
	}

	changed, err = repo.FinishRoom(ctx, roomID)
	if err != nil {
		t.Fatalf("FinishRoom (2nd): %v", err)
	}
	if changed {
		t.Errorf("expected second FinishRoom call to report changed=false (already finished)")
	}

	room, err := repo.FindRoomByID(ctx, roomID)
	if err != nil {
		t.Fatalf("FindRoomByID: %v", err)
	}
	if room.Phase != domain.PhaseFinished {
		t.Errorf("expected room phase %q, got %q", domain.PhaseFinished, room.Phase)
	}
}
