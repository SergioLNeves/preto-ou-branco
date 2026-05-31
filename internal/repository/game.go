package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"preto-ou-branco/internal/domain"
)

var (
	tableCategory        = "category"
	tableQuestion        = "question"
	tableVote            = "vote"
	tableQuestionResults = "question_results"
)

type GameRepo struct {
	db *gorm.DB
}

func NewGameRepo(db *gorm.DB) domain.GameRepository {
	return &GameRepo{db: db}
}

func (r *GameRepo) ListCategories(ctx context.Context) ([]domain.Category, error) {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	var categories []domain.Category
	if err := r.db.WithContext(ctx).Table(tableCategory).Find(&categories).Error; err != nil {
		return nil, err
	}
	return categories, nil
}

func (r *GameRepo) ListQuestionsByCategory(ctx context.Context, categoryID uuid.UUID) ([]domain.Question, error) {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	var questions []domain.Question
	if err := r.db.WithContext(ctx).Table(tableQuestion).
		Where("category_id = ?", categoryID.String()).
		Find(&questions).Error; err != nil {
		return nil, err
	}
	return questions, nil
}

func (r *GameRepo) ListRandomQuestions(ctx context.Context, limit int) ([]domain.Question, error) {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	var questions []domain.Question
	if err := r.db.WithContext(ctx).Table(tableQuestion).
		Order("RANDOM()").
		Limit(limit).
		Find(&questions).Error; err != nil {
		return nil, err
	}
	return questions, nil
}

func (r *GameRepo) SubmitVoteTx(ctx context.Context, questionID uuid.UUID, choice string) (*domain.VoteTxResult, error) {
	var result domain.VoteTxResult
	if err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Table(tableQuestion).Where("id = ?", questionID.String()).Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			return domain.ErrQuestionNotFound
		}

		vote := domain.Vote{
			ID:         uuid.New(),
			QuestionID: questionID,
			Choice:     choice,
		}
		if err := tx.Table(tableVote).Create(&vote).Error; err != nil {
			return err
		}

		type voteCount struct {
			Choice string
			Count  int64
		}
		var counts []voteCount
		if err := tx.Table(tableVote).
			Select("choice, count(*) as count").
			Where("question_id = ?", questionID.String()).
			Group("choice").
			Scan(&counts).Error; err != nil {
			return err
		}
		for _, c := range counts {
			switch c.Choice {
			case "preto":
				result.Preto = c.Count
			case "branco":
				result.Branco = c.Count
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *GameRepo) GetDayVotesLive(ctx context.Context, date time.Time) ([]domain.DayVotesEntry, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	type row struct {
		QuestionID  string
		Text        string
		VotesPreto  int
		VotesBranco int
	}
	var rows []row
	if err := r.db.WithContext(ctx).
		Table(tableVote+" v").
		Select(`v.question_id,
			q.text,
			SUM(CASE WHEN v.choice = 'preto' THEN 1 ELSE 0 END) as votes_preto,
			SUM(CASE WHEN v.choice = 'branco' THEN 1 ELSE 0 END) as votes_branco`).
		Joins("JOIN "+tableQuestion+" q ON q.id = v.question_id").
		Where("DATE(v.created_at) = DATE(?)", date).
		Group("v.question_id").
		Order("(SUM(CASE WHEN v.choice = 'preto' THEN 1 ELSE 0 END) + SUM(CASE WHEN v.choice = 'branco' THEN 1 ELSE 0 END)) DESC").
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	entries := make([]domain.DayVotesEntry, 0, len(rows))
	for _, row := range rows {
		entries = append(entries, domain.DayVotesEntry{
			QuestionID:  row.QuestionID,
			Text:        row.Text,
			VotesPreto:  row.VotesPreto,
			VotesBranco: row.VotesBranco,
			Total:       row.VotesPreto + row.VotesBranco,
		})
	}
	return entries, nil
}

func (r *GameRepo) AggregateDailyResults(ctx context.Context, date time.Time) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	type row struct {
		QuestionID  string
		VotesPreto  int
		VotesBranco int
	}
	var rows []row
	if err := r.db.WithContext(ctx).
		Table(tableVote).
		Select(`question_id,
			SUM(CASE WHEN choice = 'preto' THEN 1 ELSE 0 END) as votes_preto,
			SUM(CASE WHEN choice = 'branco' THEN 1 ELSE 0 END) as votes_branco`).
		Where("DATE(created_at) = DATE(?)", date).
		Group("question_id").
		Scan(&rows).Error; err != nil {
		return err
	}

	dateStr := date.Format("2006-01-02")
	for _, row := range rows {
		total := row.VotesPreto + row.VotesBranco
		if err := r.db.WithContext(ctx).Exec(`
			INSERT INTO `+tableQuestionResults+` (id, question_id, date, votes_preto, votes_branco, total)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(question_id, date) DO UPDATE SET
				votes_preto = excluded.votes_preto,
				votes_branco = excluded.votes_branco,
				total = excluded.total`,
			uuid.New().String(), row.QuestionID, dateStr,
			row.VotesPreto, row.VotesBranco, total,
		).Error; err != nil {
			return err
		}
	}
	return nil
}
