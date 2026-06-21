package gamedata

import (
	"bufio"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

var remoteHTTPClient = &http.Client{Timeout: 15 * time.Second}

// LoadFromURL fetches category and question data from baseURL, which must
// expose the same file layout as the embedded BD/ directory:
//
//	<baseURL>/index.txt              — one category slug per line
//	<baseURL>/<slug>/category.md     — frontmatter with name/emoji
//	<baseURL>/<slug>/leve.csv        — questions for level "leve"
//	<baseURL>/<slug>/medio.csv       — questions for level "medio"
//	<baseURL>/<slug>/acido.csv       — questions for level "acido"
//	<baseURL>/<slug>/pesado.csv      — questions for level "pesado"
func LoadFromURL(baseURL string) ([]Category, []Question, error) {
	slugs, err := fetchSlugs(baseURL)
	if err != nil {
		return nil, nil, err
	}

	categories := make([]Category, 0, len(slugs))
	questions := make([]Question, 0, len(slugs)*len(Levels)*20)

	for _, slug := range slugs {
		cat, err := fetchCategory(baseURL, slug)
		if err != nil {
			return nil, nil, err
		}
		categories = append(categories, cat)

		for _, level := range Levels {
			qs, err := fetchQuestions(baseURL, slug, level)
			if err != nil {
				return nil, nil, err
			}
			questions = append(questions, qs...)
		}
	}

	return categories, questions, nil
}

func fetchSlugs(baseURL string) ([]string, error) {
	body, err := fetchText(baseURL + "/index.txt")
	if err != nil {
		return nil, fmt.Errorf("gamedata remote: fetch index.txt: %w", err)
	}
	var slugs []string
	sc := bufio.NewScanner(strings.NewReader(body))
	for sc.Scan() {
		s := strings.TrimSpace(sc.Text())
		if s != "" && !strings.HasPrefix(s, "#") {
			slugs = append(slugs, s)
		}
	}
	if len(slugs) == 0 {
		return nil, fmt.Errorf("gamedata remote: index.txt is empty or has no valid slugs")
	}
	return slugs, nil
}

func fetchCategory(baseURL, slug string) (Category, error) {
	body, err := fetchText(baseURL + "/" + slug + "/category.md")
	if err != nil {
		return Category{}, fmt.Errorf("gamedata remote: fetch %s/category.md: %w", slug, err)
	}
	cat := Category{Slug: slug}
	sc := bufio.NewScanner(strings.NewReader(body))
	inFrontmatter := false
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "---" {
			if !inFrontmatter {
				inFrontmatter = true
				continue
			}
			break
		}
		if !inFrontmatter {
			continue
		}
		before, after, found := strings.Cut(line, ":")
		if !found {
			continue
		}
		switch strings.TrimSpace(before) {
		case "name":
			cat.Name = strings.TrimSpace(after)
		case "emoji":
			cat.Emoji = strings.TrimSpace(after)
		}
	}
	if cat.Name == "" {
		return Category{}, fmt.Errorf("gamedata remote: %s/category.md: missing 'name' field", slug)
	}
	if cat.Emoji == "" {
		return Category{}, fmt.Errorf("gamedata remote: %s/category.md: missing 'emoji' field", slug)
	}
	return cat, nil
}

func fetchQuestions(baseURL, slug, level string) ([]Question, error) {
	url := baseURL + "/" + slug + "/" + level + ".csv"
	body, err := fetchText(url)
	if err != nil {
		return nil, fmt.Errorf("gamedata remote: fetch %s/%s.csv: %w", slug, level, err)
	}
	r := csv.NewReader(strings.NewReader(body))
	r.TrimLeadingSpace = true
	r.FieldsPerRecord = -1 // allow rows with more fields than the header (e.g. commas in text)
	header, err := r.Read()
	if err != nil {
		return nil, fmt.Errorf("gamedata remote: %s/%s.csv: read header: %w", slug, level, err)
	}
	textoIdx := -1
	for i, h := range header {
		if strings.EqualFold(strings.TrimSpace(h), "texto") {
			textoIdx = i
			break
		}
	}
	if textoIdx < 0 {
		return nil, fmt.Errorf("gamedata remote: %s/%s.csv: column 'texto' not found", slug, level)
	}
	records, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("gamedata remote: %s/%s.csv: read rows: %w", slug, level, err)
	}
	var qs []Question
	for _, rec := range records {
		if textoIdx >= len(rec) {
			continue
		}
		if text := strings.TrimSpace(rec[textoIdx]); text != "" {
			qs = append(qs, Question{CategorySlug: slug, Difficulty: level, Text: text})
		}
	}
	return qs, nil
}

func fetchText(url string) (string, error) {
	resp, err := remoteHTTPClient.Get(url)
	if err != nil {
		return "", fmt.Errorf("GET %s: %w", url, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("GET %s: status %d", url, resp.StatusCode)
	}
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read %s: %w", url, err)
	}
	return string(b), nil
}
