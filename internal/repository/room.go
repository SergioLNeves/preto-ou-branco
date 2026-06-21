package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"preto-ou-branco/internal/domain"
	"preto-ou-branco/internal/storage/sqlite"
)

type RoomRepo struct {
	db *gorm.DB
}

func NewRoomRepo(db *gorm.DB) *RoomRepo {
	return &RoomRepo{db: db}
}

func toRoom(r sqlite.RoomTable) *domain.Room {
	return &domain.Room{
		ID:            r.ID,
		HostUserID:    r.HostUserID,
		QuestionCount: r.QuestionCount,
		Difficulty:    domain.RoomDifficulty(r.Difficulty),
		Phase:         domain.RoomPhase(r.Phase),
		CreatedAt:     r.CreatedAt,
		UpdatedAt:     r.UpdatedAt,
	}
}

func toParticipant(p sqlite.RoomParticipantTable) *domain.RoomParticipant {
	return &domain.RoomParticipant{
		ID:          p.ID,
		RoomID:      p.RoomID,
		UserID:      p.UserID,
		Username:    p.Username,
		Emoji:       p.Emoji,
		GuestToken:  p.GuestToken,
		HasFinished: p.HasFinished,
		JoinedAt:    p.JoinedAt,
		LastSeenAt:  p.LastSeenAt,
	}
}

func (r *RoomRepo) CreateRoom(ctx context.Context, room *domain.Room) error {
	diff := string(room.Difficulty)
	if diff == "" {
		diff = string(domain.DifficultyLeve)
	}
	row := sqlite.RoomTable{
		ID:            room.ID,
		HostUserID:    room.HostUserID,
		QuestionCount: room.QuestionCount,
		Difficulty:    diff,
		Phase:         string(room.Phase),
		CreatedAt:     room.CreatedAt,
		UpdatedAt:     room.UpdatedAt,
	}
	return r.db.WithContext(ctx).Create(&row).Error
}

func (r *RoomRepo) FindRoomByID(ctx context.Context, id string) (*domain.Room, error) {
	var row sqlite.RoomTable
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrRoomNotFound
	}
	if err != nil {
		return nil, err
	}
	return toRoom(row), nil
}

func (r *RoomRepo) UpdateRoom(ctx context.Context, room *domain.Room) error {
	return r.db.WithContext(ctx).Model(&sqlite.RoomTable{}).Where("id = ?", room.ID).Updates(map[string]any{
		"phase":      string(room.Phase),
		"updated_at": time.Now().UTC(),
	}).Error
}

// FinishRoom transitions the room to "finished" only if it isn't already,
// returning whether the row was actually updated. Callers use this to make
// the lobby/playing → finished transition idempotent under concurrent
// triggers (e.g. two participants submitting their final vote at once).
func (r *RoomRepo) FinishRoom(ctx context.Context, roomID string) (bool, error) {
	res := r.db.WithContext(ctx).Model(&sqlite.RoomTable{}).
		Where("id = ? AND phase != ?", roomID, string(domain.PhaseFinished)).
		Updates(map[string]any{
			"phase":      string(domain.PhaseFinished),
			"updated_at": time.Now().UTC(),
		})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

// Transaction runs fn within a database transaction, giving it a repository
// bound to the transactional connection so all operations commit or roll
// back together.
func (r *RoomRepo) Transaction(ctx context.Context, fn func(repo domain.RoomRepository) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(&RoomRepo{db: tx})
	})
}

func (r *RoomRepo) DeleteRoom(ctx context.Context, roomID string) error {
	return r.db.WithContext(ctx).Where("id = ?", roomID).Delete(&sqlite.RoomTable{}).Error
}

func (r *RoomRepo) UpdateRoomSettings(ctx context.Context, roomID string, count int, difficulty domain.RoomDifficulty) error {
	return r.db.WithContext(ctx).Model(&sqlite.RoomTable{}).Where("id = ?", roomID).Updates(map[string]any{
		"question_count": count,
		"difficulty":     string(difficulty),
		"updated_at":     time.Now().UTC(),
	}).Error
}

func (r *RoomRepo) CountParticipants(ctx context.Context, roomID string) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&sqlite.RoomParticipantTable{}).Where("room_id = ?", roomID).Count(&count).Error
	return int(count), err
}

func (r *RoomRepo) AddParticipant(ctx context.Context, p *domain.RoomParticipant) error {
	row := sqlite.RoomParticipantTable{
		ID:          p.ID,
		RoomID:      p.RoomID,
		UserID:      p.UserID,
		Username:    p.Username,
		Emoji:       p.Emoji,
		GuestToken:  p.GuestToken,
		HasFinished: false,
		JoinedAt:    p.JoinedAt,
		LastSeenAt:  p.LastSeenAt,
	}
	return r.db.WithContext(ctx).Create(&row).Error
}

func (r *RoomRepo) UpdateParticipant(ctx context.Context, p *domain.RoomParticipant) error {
	return r.db.WithContext(ctx).Model(&sqlite.RoomParticipantTable{}).Where("id = ?", p.ID).Updates(map[string]any{
		"has_finished": p.HasFinished,
		"last_seen_at": time.Now().UTC(),
	}).Error
}

func (r *RoomRepo) ResetParticipantsFinished(ctx context.Context, roomID string) error {
	return r.db.WithContext(ctx).Model(&sqlite.RoomParticipantTable{}).
		Where("room_id = ?", roomID).
		Update("has_finished", false).Error
}

func (r *RoomRepo) FindParticipantByGuestToken(ctx context.Context, token string) (*domain.RoomParticipant, error) {
	var row sqlite.RoomParticipantTable
	err := r.db.WithContext(ctx).Where("guest_token = ?", token).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrParticipantNotInRoom
	}
	if err != nil {
		return nil, err
	}
	return toParticipant(row), nil
}

func (r *RoomRepo) FindParticipantByUserAndRoom(ctx context.Context, userID, roomID string) (*domain.RoomParticipant, error) {
	var row sqlite.RoomParticipantTable
	err := r.db.WithContext(ctx).Where("user_id = ? AND room_id = ?", userID, roomID).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrParticipantNotInRoom
	}
	if err != nil {
		return nil, err
	}
	return toParticipant(row), nil
}

func (r *RoomRepo) FindParticipantByID(ctx context.Context, id string) (*domain.RoomParticipant, error) {
	var row sqlite.RoomParticipantTable
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrParticipantNotInRoom
	}
	if err != nil {
		return nil, err
	}
	return toParticipant(row), nil
}

func (r *RoomRepo) ListParticipants(ctx context.Context, roomID string) ([]domain.RoomParticipant, error) {
	var rows []sqlite.RoomParticipantTable
	if err := r.db.WithContext(ctx).Where("room_id = ?", roomID).Order("joined_at asc").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.RoomParticipant, len(rows))
	for i, row := range rows {
		out[i] = *toParticipant(row)
	}
	return out, nil
}

func (r *RoomRepo) SnapshotQuestions(ctx context.Context, roomID string, questions []domain.QuestionResponse) error {
	rows := make([]sqlite.RoomQuestionTable, len(questions))
	for i, q := range questions {
		rows[i] = sqlite.RoomQuestionTable{
			ID:           uuid.New().String(),
			RoomID:       roomID,
			QuestionID:   q.ID,
			QuestionText: q.Text,
			Order:        i,
		}
	}
	return r.db.WithContext(ctx).Create(&rows).Error
}

func (r *RoomRepo) ListRoomQuestions(ctx context.Context, roomID string) ([]domain.RoomQuestion, error) {
	var rows []sqlite.RoomQuestionTable
	if err := r.db.WithContext(ctx).Where("room_id = ?", roomID).Order("`order` asc").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.RoomQuestion, len(rows))
	for i, row := range rows {
		out[i] = domain.RoomQuestion{
			ID:           row.ID,
			RoomID:       row.RoomID,
			QuestionID:   row.QuestionID,
			QuestionText: row.QuestionText,
			Order:        row.Order,
		}
	}
	return out, nil
}

func (r *RoomRepo) FindRoomQuestion(ctx context.Context, id string) (*domain.RoomQuestion, error) {
	var row sqlite.RoomQuestionTable
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrRoomNotFound
	}
	if err != nil {
		return nil, err
	}
	return &domain.RoomQuestion{ID: row.ID, RoomID: row.RoomID, QuestionID: row.QuestionID, QuestionText: row.QuestionText, Order: row.Order}, nil
}

func (r *RoomRepo) DeleteRoomQuestions(ctx context.Context, roomID string) error {
	return r.db.WithContext(ctx).Where("room_id = ?", roomID).Delete(&sqlite.RoomQuestionTable{}).Error
}

func (r *RoomRepo) UpsertVote(ctx context.Context, vote *domain.RoomVote) error {
	row := sqlite.RoomVoteTable{
		ID:             vote.ID,
		RoomQuestionID: vote.RoomQuestionID,
		ParticipantID:  vote.ParticipantID,
		Choice:         vote.Choice,
		CreatedAt:      time.Now().UTC(),
	}
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "room_question_id"}, {Name: "participant_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"choice"}),
	}).Create(&row).Error
}

func (r *RoomRepo) CountVotesByParticipant(ctx context.Context, participantID, roomID string) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&sqlite.RoomVoteTable{}).
		Joins("JOIN room_question ON room_vote.room_question_id = room_question.id").
		Where("room_vote.participant_id = ? AND room_question.room_id = ?", participantID, roomID).
		Count(&count).Error
	return int(count), err
}

func (r *RoomRepo) ListVotesForQuestion(ctx context.Context, roomQuestionID string) ([]domain.RoomVote, error) {
	var rows []sqlite.RoomVoteTable
	if err := r.db.WithContext(ctx).Where("room_question_id = ?", roomQuestionID).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.RoomVote, len(rows))
	for i, row := range rows {
		out[i] = domain.RoomVote{ID: row.ID, RoomQuestionID: row.RoomQuestionID, ParticipantID: row.ParticipantID, Choice: row.Choice, CreatedAt: row.CreatedAt}
	}
	return out, nil
}

// ComputeScoreboard applies 2/1/0 scoring: majority → +2, tie → +1, minority → +0.
func (r *RoomRepo) ComputeScoreboard(ctx context.Context, roomID string) ([]domain.ScoreboardEntry, error) {
	questions, err := r.ListRoomQuestions(ctx, roomID)
	if err != nil {
		return nil, err
	}
	participants, err := r.ListParticipants(ctx, roomID)
	if err != nil {
		return nil, err
	}

	points := make(map[string]int)
	for _, p := range participants {
		points[p.ID] = 0
	}

	for _, q := range questions {
		votes, err := r.ListVotesForQuestion(ctx, q.ID)
		if err != nil {
			return nil, err
		}
		preto, branco := 0, 0
		for _, v := range votes {
			if v.Choice == "preto" {
				preto++
			} else {
				branco++
			}
		}
		if preto == branco {
			for _, v := range votes {
				points[v.ParticipantID]++
			}
		} else {
			winner := "preto"
			if branco > preto {
				winner = "branco"
			}
			for _, v := range votes {
				if v.Choice == winner {
					points[v.ParticipantID] += 2
				}
			}
		}
	}

	out := make([]domain.ScoreboardEntry, 0, len(participants))
	for _, p := range participants {
		out = append(out, domain.ScoreboardEntry{
			ParticipantID: p.ID,
			Username:      p.Username,
			Emoji:         p.Emoji,
			Points:        points[p.ID],
		})
	}
	for i := 0; i < len(out)-1; i++ {
		for j := i + 1; j < len(out); j++ {
			if out[j].Points > out[i].Points {
				out[i], out[j] = out[j], out[i]
			}
		}
	}
	return out, nil
}

// ComputeResultSteps returns per-question outcomes for the animated reveal.
func (r *RoomRepo) ComputeResultSteps(ctx context.Context, roomID string) ([]domain.ResultStep, error) {
	questions, err := r.ListRoomQuestions(ctx, roomID)
	if err != nil {
		return nil, err
	}

	steps := make([]domain.ResultStep, 0, len(questions))
	for _, q := range questions {
		votes, err := r.ListVotesForQuestion(ctx, q.ID)
		if err != nil {
			return nil, err
		}
		preto, branco := 0, 0
		for _, v := range votes {
			if v.Choice == "preto" {
				preto++
			} else {
				branco++
			}
		}
		stepPoints := make(map[string]int)
		var outcome string
		if preto == branco {
			outcome = "tie"
			for _, v := range votes {
				stepPoints[v.ParticipantID] = 1
			}
		} else {
			winner := "preto"
			if branco > preto {
				winner = "branco"
			}
			outcome = winner
			for _, v := range votes {
				if v.Choice == winner {
					stepPoints[v.ParticipantID] = 2
				}
			}
		}
		steps = append(steps, domain.ResultStep{
			QuestionText: q.QuestionText,
			PretoCount:   preto,
			BrancoCount:  branco,
			Outcome:      outcome,
			Points:       stepPoints,
		})
	}
	return steps, nil
}
