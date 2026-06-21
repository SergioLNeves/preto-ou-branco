package sqlite

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"preto-ou-branco/internal/gamedata"
)

var seedNamespace = uuid.MustParse("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

func seedID(slug string) string {
	return uuid.NewSHA1(seedNamespace, []byte(slug)).String()
}

func DBPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("user config dir: %w", err)
	}
	return filepath.Join(dir, "preto-ou-branco", "app.db"), nil
}

func Open() (*gorm.DB, error) {
	dbPath, err := DBPath()
	if err != nil {
		return nil, err
	}
	return OpenAt(dbPath)
}

// OpenAt opens (or creates) the database at an explicit path.
// Used by the mobile build where the Android app provides the files directory.
func OpenAt(dbPath string) (*gorm.DB, error) {
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return nil, fmt.Errorf("create db directory: %w", err)
	}

	db, err := gorm.Open(
		sqlite.Open(dbPath+"?_pragma=foreign_keys(1)"),
		&gorm.Config{
			Logger:      logger.Default.LogMode(logger.Silent),
			NowFunc:     func() time.Time { return time.Now().UTC() },
			PrepareStmt: true,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	if err := db.AutoMigrate(GetModelsToMigrate()...); err != nil {
		return nil, fmt.Errorf("auto migrate: %w", err)
	}

	if err := seedGameData(db); err != nil {
		return nil, fmt.Errorf("seed: %w", err)
	}

	gcExpiredSessions(db)

	return db, nil
}

// gcExpiredSessions removes expired sessions on startup so the user_session
// table doesn't grow unbounded over the app's lifetime. Best-effort: a
// failure here shouldn't block startup.
func gcExpiredSessions(db *gorm.DB) {
	db.Where("expires_at < ?", time.Now().UTC()).Delete(&UserSessionTable{})
}

func seedGameData(db *gorm.DB) error {
	categories, questions, err := gamedata.Load()
	if err != nil {
		return fmt.Errorf("seed load gamedata: %w", err)
	}
	_, err = ReconcileGameData(db, categories, questions)
	return err
}

// ReconcileResult reports the outcome of a ReconcileGameData call.
type ReconcileResult struct {
	Added   int // questions inserted
	Removed int // questions deleted (unreferenced by game history)
	Skipped int // questions removed from files but kept because used in past games
}

// ReconcileGameData syncs the database catalog against the provided categories
// and questions:
//   - inserts records missing from the DB
//   - deletes questions no longer in the list, unless referenced by a room_question
//   - deletes categories no longer in the list, unless still referenced by questions
//
// IDs are derived via UUIDv5 so the operation is deterministic and idempotent.
func ReconcileGameData(db *gorm.DB, categories []gamedata.Category, questions []gamedata.Question) (ReconcileResult, error) {
	var result ReconcileResult

	wantCategoryIDs := make(map[string]struct{}, len(categories))
	for _, c := range categories {
		wantCategoryIDs[seedID("category:"+c.Slug)] = struct{}{}
	}
	wantQuestionIDs := make(map[string]struct{}, len(questions))
	for _, q := range questions {
		wantQuestionIDs[seedID("question:"+q.CategorySlug+":"+q.Difficulty+":"+q.Text)] = struct{}{}
	}

	// --- Remove questions no longer in the source ---
	var dbQuestions []QuestionTable
	if err := db.Find(&dbQuestions).Error; err != nil {
		return result, fmt.Errorf("reconcile list questions: %w", err)
	}
	for _, dq := range dbQuestions {
		if _, ok := wantQuestionIDs[dq.ID]; ok {
			continue
		}
		var refCount int64
		db.Model(&RoomQuestionTable{}).Where("question_id = ?", dq.ID).Count(&refCount)
		if refCount > 0 {
			result.Skipped++
			continue
		}
		if err := db.Delete(&QuestionTable{}, "id = ?", dq.ID).Error; err != nil {
			return result, fmt.Errorf("reconcile delete question %s: %w", dq.ID, err)
		}
		result.Removed++
	}

	// --- Remove categories no longer in the source ---
	var dbCategories []CategoryTable
	if err := db.Find(&dbCategories).Error; err != nil {
		return result, fmt.Errorf("reconcile list categories: %w", err)
	}
	for _, dc := range dbCategories {
		if _, ok := wantCategoryIDs[dc.ID]; ok {
			continue
		}
		var qCount int64
		db.Model(&QuestionTable{}).Where("category_id = ?", dc.ID).Count(&qCount)
		if qCount > 0 {
			continue
		}
		if err := db.Delete(&CategoryTable{}, "id = ?", dc.ID).Error; err != nil {
			return result, fmt.Errorf("reconcile delete category %s: %w", dc.ID, err)
		}
	}

	// --- Insert missing categories ---
	categoryIDs := make(map[string]string, len(categories))
	for _, c := range categories {
		id := seedID("category:" + c.Slug)
		var existing CategoryTable
		if err := db.Where("id = ?", id).First(&existing).Error; err != nil {
			row := CategoryTable{ID: id, Slug: c.Slug, Name: c.Name, Emoji: c.Emoji}
			if err2 := db.Create(&row).Error; err2 != nil {
				return result, fmt.Errorf("reconcile insert category %s: %w", c.Slug, err2)
			}
		}
		categoryIDs[c.Slug] = id
	}

	// --- Insert missing questions ---
	for _, q := range questions {
		id := seedID("question:" + q.CategorySlug + ":" + q.Difficulty + ":" + q.Text)
		var existing QuestionTable
		if err := db.Where("id = ?", id).First(&existing).Error; err != nil {
			row := QuestionTable{
				ID:         id,
				CategoryID: categoryIDs[q.CategorySlug],
				Difficulty: q.Difficulty,
				Text:       q.Text,
			}
			if err2 := db.Create(&row).Error; err2 != nil {
				return result, fmt.Errorf("reconcile insert question %q: %w", q.Text, err2)
			}
			result.Added++
		}
	}
	return result, nil
}
