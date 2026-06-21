package gamedata_test

import (
	"slices"
	"testing"

	"preto-ou-branco/internal/gamedata"
)

func TestLoad_NoError(t *testing.T) {
	_, _, err := gamedata.Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
}

func TestLoad_CategoriesHaveRequiredFields(t *testing.T) {
	cats, _, err := gamedata.Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if len(cats) == 0 {
		t.Fatal("Load() returned no categories")
	}
	for _, c := range cats {
		if c.Slug == "" {
			t.Errorf("category with empty slug: %+v", c)
		}
		if c.Name == "" {
			t.Errorf("category %q has empty name", c.Slug)
		}
		if c.Emoji == "" {
			t.Errorf("category %q has empty emoji", c.Slug)
		}
	}
}

func TestLoad_QuestionsHaveRequiredFields(t *testing.T) {
	_, qs, err := gamedata.Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if len(qs) == 0 {
		t.Fatal("Load() returned no questions")
	}
	validLevels := gamedata.Levels
	for _, q := range qs {
		if q.CategorySlug == "" {
			t.Errorf("question with empty CategorySlug: %+v", q)
		}
		if q.Text == "" {
			t.Errorf("question in %q/%q has empty text", q.CategorySlug, q.Difficulty)
		}
		if !slices.Contains(validLevels, q.Difficulty) {
			t.Errorf("question %q has invalid difficulty %q", q.Text, q.Difficulty)
		}
	}
}

func TestLoad_AllLevelsPresent(t *testing.T) {
	cats, qs, err := gamedata.Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}

	// For each category, all four difficulty levels must have at least one question.
	type key struct{ slug, level string }
	covered := make(map[key]int)
	for _, q := range qs {
		covered[key{q.CategorySlug, q.Difficulty}]++
	}

	for _, c := range cats {
		for _, lvl := range gamedata.Levels {
			n := covered[key{c.Slug, lvl}]
			if n == 0 {
				t.Errorf("category %q: level %q has no questions", c.Slug, lvl)
			}
		}
	}
}

func TestLoad_SortedBySlug(t *testing.T) {
	cats, _, err := gamedata.Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	for i := 1; i < len(cats); i++ {
		if cats[i].Slug < cats[i-1].Slug {
			t.Errorf("categories not sorted: %q < %q at index %d", cats[i].Slug, cats[i-1].Slug, i)
		}
	}
}

func TestLoad_Idempotent(t *testing.T) {
	cats1, qs1, err := gamedata.Load()
	if err != nil {
		t.Fatalf("first Load() error: %v", err)
	}
	cats2, qs2, err := gamedata.Load()
	if err != nil {
		t.Fatalf("second Load() error: %v", err)
	}
	if len(cats1) != len(cats2) {
		t.Errorf("category count changed between calls: %d vs %d", len(cats1), len(cats2))
	}
	if len(qs1) != len(qs2) {
		t.Errorf("question count changed between calls: %d vs %d", len(qs1), len(qs2))
	}
}
