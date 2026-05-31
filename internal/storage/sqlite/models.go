package sqlite

import "time"

type CategoryTable struct {
	ID        string `gorm:"type:varchar(36);primary_key"`
	Slug      string `gorm:"type:varchar(50);uniqueIndex;not null"`
	Name      string `gorm:"not null"`
	Emoji     string `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (CategoryTable) TableName() string { return "category" }

type QuestionTable struct {
	ID         string        `gorm:"type:varchar(36);primary_key"`
	CategoryID string        `gorm:"type:varchar(36);not null;index"`
	Category   CategoryTable `gorm:"foreignKey:CategoryID;constraint:OnDelete:RESTRICT,OnUpdate:CASCADE"`
	Text       string        `gorm:"not null"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func (QuestionTable) TableName() string { return "question" }

type VoteTable struct {
	ID         string        `gorm:"type:varchar(36);primary_key"`
	QuestionID string        `gorm:"type:varchar(36);not null;index"`
	Question   QuestionTable `gorm:"foreignKey:QuestionID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
	Choice     string        `gorm:"type:varchar(10);not null"`
	CreatedAt  time.Time
}

func (VoteTable) TableName() string { return "vote" }

type QuestionResultsTable struct {
	ID          string        `gorm:"type:varchar(36);primary_key"`
	QuestionID  string        `gorm:"type:varchar(36);not null;uniqueIndex:idx_question_results_question_date"`
	Question    QuestionTable `gorm:"foreignKey:QuestionID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
	Date        time.Time     `gorm:"type:date;not null;uniqueIndex:idx_question_results_question_date"`
	VotesPreto  int           `gorm:"not null;default:0"`
	VotesBranco int           `gorm:"not null;default:0"`
	Total       int           `gorm:"not null;default:0"`
}

func (QuestionResultsTable) TableName() string { return "question_results" }

func GetModelsToMigrate() []any {
	return []any{
		&CategoryTable{},
		&QuestionTable{},
		&VoteTable{},
		&QuestionResultsTable{},
	}
}
