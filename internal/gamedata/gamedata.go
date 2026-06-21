// Package gamedata embeds the BD/ directory (categories + questions) and exposes
// Load(), which parses the files into structs consumed by the seed layer.
//
// Layout inside BD/:
//
//	<slug>/category.md         — category metadata (frontmatter: name, emoji)
//	<slug>/leve.csv            — questions for difficulty level "leve"
//	<slug>/medio.csv           — questions for difficulty level "medio"
//	<slug>/acido.csv           — questions for difficulty level "acido"
//	<slug>/pesado.csv          — questions for difficulty level "pesado"
//
// To add a new category: create a matching <slug>/ directory with category.md
// and one CSV per difficulty level, then rebuild.
// To add questions: append lines to the relevant CSV and rebuild.
// The seed is insert-only — removing lines from CSVs does NOT delete rows
// from an existing database; drop and recreate the DB for a clean slate.
package gamedata

import (
	"bufio"
	"embed"
	"encoding/csv"
	"fmt"
	"io/fs"
	"sort"
	"strings"
)

//go:embed BD
var bdFS embed.FS

// Levels lists the valid difficulty slugs in ascending order.
var Levels = []string{"leve", "medio", "acido", "pesado"}

// Category holds metadata for a question category.
type Category struct {
	Slug  string
	Name  string
	Emoji string
}

// Question holds a single question and the slug of its parent category and
// difficulty level.
type Question struct {
	CategorySlug string
	Difficulty   string
	Text         string
}

// Load reads all category directories from BD/ and returns the parsed categories
// and questions. Results are sorted by slug to guarantee a deterministic seed
// order regardless of filesystem ordering. Every category directory must contain
// a category.md file and one CSV per difficulty level (leve, medio, acido, pesado).
func Load() ([]Category, []Question, error) {
	entries, err := bdFS.ReadDir("BD")
	if err != nil {
		return nil, nil, fmt.Errorf("gamedata: read BD dir: %w", err)
	}

	// Collect slugs from subdirectories.
	slugs := make([]string, 0)
	for _, e := range entries {
		if e.IsDir() {
			slugs = append(slugs, e.Name())
		}
	}
	sort.Strings(slugs)

	categories := make([]Category, 0, len(slugs))
	questions := make([]Question, 0, len(slugs)*len(Levels)*20)

	for _, slug := range slugs {
		cat, err := parseCategory(slug)
		if err != nil {
			return nil, nil, err
		}
		categories = append(categories, cat)

		for _, level := range Levels {
			qs, err := parseQuestions(slug, level)
			if err != nil {
				return nil, nil, err
			}
			questions = append(questions, qs...)
		}
	}

	return categories, questions, nil
}

// parseCategory reads BD/<slug>/category.md and extracts name and emoji from
// the frontmatter block (lines between the first pair of "---" delimiters).
func parseCategory(slug string) (Category, error) {
	path := "BD/" + slug + "/category.md"
	f, err := bdFS.Open(path)
	if err != nil {
		return Category{}, fmt.Errorf("gamedata: open %s: %w", path, err)
	}
	defer f.Close()

	cat := Category{Slug: slug}
	scanner := bufio.NewScanner(f)

	// Skip until first "---".
	inFrontmatter := false
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "---" {
			inFrontmatter = true
			break
		}
	}
	if !inFrontmatter {
		return Category{}, fmt.Errorf("gamedata: %s: frontmatter not found", path)
	}

	// Parse key: value pairs until closing "---".
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "---" {
			break
		}
		before, after, found := strings.Cut(line, ":")
		if !found {
			continue
		}
		key := strings.TrimSpace(before)
		val := strings.TrimSpace(after)
		switch key {
		case "name":
			cat.Name = val
		case "emoji":
			cat.Emoji = val
		}
	}
	if err := scanner.Err(); err != nil {
		return Category{}, fmt.Errorf("gamedata: scan %s: %w", path, err)
	}

	if cat.Name == "" {
		return Category{}, fmt.Errorf("gamedata: %s: missing 'name' field", path)
	}
	if cat.Emoji == "" {
		return Category{}, fmt.Errorf("gamedata: %s: missing 'emoji' field", path)
	}

	return cat, nil
}

// parseQuestions reads BD/<slug>/<level>.csv and returns one Question per data
// row. The file must have a header row containing a "texto" column; additional
// columns are silently ignored to allow future extensions.
func parseQuestions(slug, level string) ([]Question, error) {
	path := "BD/" + slug + "/" + level + ".csv"
	f, err := bdFS.Open(path)
	if err != nil {
		if isNotExist(err) {
			return nil, fmt.Errorf("gamedata: %s/%s.csv not found (all four levels are required)", slug, level)
		}
		return nil, fmt.Errorf("gamedata: open %s: %w", path, err)
	}
	defer f.Close()

	r := csv.NewReader(f)
	r.TrimLeadingSpace = true
	r.FieldsPerRecord = -1 // allow rows with more fields than the header (e.g. commas in text)

	header, err := r.Read()
	if err != nil {
		return nil, fmt.Errorf("gamedata: %s: read header: %w", path, err)
	}

	// Locate the "texto" column (case-insensitive).
	textoIdx := -1
	for i, h := range header {
		if strings.EqualFold(strings.TrimSpace(h), "texto") {
			textoIdx = i
			break
		}
	}
	if textoIdx < 0 {
		return nil, fmt.Errorf("gamedata: %s: required column 'texto' not found in header", path)
	}

	records, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("gamedata: %s: read rows: %w", path, err)
	}

	var qs []Question
	for _, rec := range records {
		if textoIdx >= len(rec) {
			continue
		}
		text := strings.TrimSpace(rec[textoIdx])
		if text == "" {
			continue
		}
		qs = append(qs, Question{CategorySlug: slug, Difficulty: level, Text: text})
	}

	return qs, nil
}

// isNotExist checks whether an fs.ErrNotExist-wrapped error was returned.
func isNotExist(err error) bool {
	return err != nil && strings.Contains(err.Error(), fs.ErrNotExist.Error())
}
