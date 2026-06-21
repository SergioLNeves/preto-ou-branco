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
	Difficulty string        `gorm:"type:varchar(16);not null;default:'leve';index"`
	Text       string        `gorm:"not null"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func (QuestionTable) TableName() string { return "question" }

// Auth tables

type UserTable struct {
	ID           string `gorm:"type:varchar(36);primary_key"`
	Username     string `gorm:"type:varchar(64);uniqueIndex;not null"`
	PasswordHash string `gorm:"not null"`
	CreatedAt    time.Time
}

func (UserTable) TableName() string { return "user" }

type UserSessionTable struct {
	Token     string    `gorm:"type:varchar(36);primary_key"`
	UserID    string    `gorm:"type:varchar(36);not null;index"`
	User      UserTable `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	ExpiresAt time.Time `gorm:"not null"`
}

func (UserSessionTable) TableName() string { return "user_session" }

// Room tables

type RoomTable struct {
	ID            string `gorm:"type:varchar(36);primary_key"`
	HostUserID    string `gorm:"type:varchar(36);not null"`
	QuestionCount int    `gorm:"not null"`
	Difficulty    string `gorm:"type:varchar(16);not null;default:'leve'"`
	Phase         string `gorm:"type:varchar(16);not null;default:'lobby'"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (RoomTable) TableName() string { return "room" }

type RoomParticipantTable struct {
	ID          string    `gorm:"type:varchar(36);primary_key"`
	RoomID      string    `gorm:"type:varchar(36);not null;index"`
	Room        RoomTable `gorm:"foreignKey:RoomID;constraint:OnDelete:CASCADE"`
	UserID      *string   `gorm:"type:varchar(36);index"`
	Username    string    `gorm:"type:varchar(64);not null"`
	Emoji       string    `gorm:"type:varchar(8);not null"`
	GuestToken  *string   `gorm:"type:varchar(36);uniqueIndex"`
	HasFinished bool      `gorm:"not null;default:false"`
	JoinedAt    time.Time
	LastSeenAt  time.Time
}

func (RoomParticipantTable) TableName() string { return "room_participant" }

type RoomQuestionTable struct {
	ID           string    `gorm:"type:varchar(36);primary_key"`
	RoomID       string    `gorm:"type:varchar(36);not null;index"`
	Room         RoomTable `gorm:"foreignKey:RoomID;constraint:OnDelete:CASCADE"`
	QuestionID   string    `gorm:"type:varchar(36);not null"`
	QuestionText string    `gorm:"not null"`
	Order        int       `gorm:"not null"`
}

func (RoomQuestionTable) TableName() string { return "room_question" }

type RoomVoteTable struct {
	ID             string               `gorm:"type:varchar(36);primary_key"`
	RoomQuestionID string               `gorm:"type:varchar(36);not null;uniqueIndex:idx_room_vote_unique;index"`
	RoomQuestion   RoomQuestionTable    `gorm:"foreignKey:RoomQuestionID;constraint:OnDelete:CASCADE"`
	ParticipantID  string               `gorm:"type:varchar(36);not null;uniqueIndex:idx_room_vote_unique"`
	Participant    RoomParticipantTable `gorm:"foreignKey:ParticipantID;constraint:OnDelete:CASCADE"`
	Choice         string               `gorm:"type:varchar(10);not null"`
	CreatedAt      time.Time
}

func (RoomVoteTable) TableName() string { return "room_vote" }

func GetModelsToMigrate() []any {
	return []any{
		&CategoryTable{},
		&QuestionTable{},
		&UserTable{},
		&UserSessionTable{},
		&RoomTable{},
		&RoomParticipantTable{},
		&RoomQuestionTable{},
		&RoomVoteTable{},
	}
}
