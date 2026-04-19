package mapper

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/codeyee/denn-proxy/internal/models"
	"github.com/codeyee/denn-proxy/internal/providers/openlibrary"
	"github.com/codeyee/denn-proxy/internal/services/books"
)

func buildCoverURL(coverID int, size string) string {
	return fmt.Sprintf("%s/b/id/%d-%s.jpg", openlibrary.CoversURL, coverID, size)
}

func buildImages(coverID *int) *models.Images {
	if coverID == nil {
		return nil
	}

	standard := buildCoverURL(*coverID, "M")
	original := buildCoverURL(*coverID, "L")

	return &models.Images{
		PosterStandard: &standard,
		PosterOriginal: &original,
	}
}

func buildImageURL(coverID *int) *string {
	if coverID == nil {
		return nil
	}

	url := buildCoverURL(*coverID, "L")
	return &url
}

func extractID(key string) string {
	if key == "" {
		return ""
	}

	if idx := strings.LastIndex(key, "/"); idx >= 0 {
		return key[idx+1:]
	}

	return key
}

func mapAuthors(names []string) []models.Author {
	if len(names) == 0 {
		return nil
	}

	authors := make([]models.Author, 0, len(names))
	for _, name := range names {
		if name != "" {
			authors = append(authors, models.Author{
				Name: name,
				Type: string(models.AuthorTypeAuthor),
			})
		}
	}

	if len(authors) == 0 {
		return nil
	}

	return authors
}

func extractDescription(firstSentence []string) *string {
	if len(firstSentence) == 0 {
		return nil
	}

	if firstSentence[0] == "" {
		return nil
	}

	return &firstSentence[0]
}

func formatReleaseDate(firstPublishYear *int) *string {
	if firstPublishYear == nil {
		return nil
	}

	date := strconv.Itoa(*firstPublishYear)
	return &date
}

func MapSearchItem(doc books.OlDoc) models.SearchItem {
	title := doc.Title

	return models.SearchItem{
		ID:            extractID(doc.Key),
		Type:          string(models.ContentTypeBook),
		Title:         title,
		OriginalTitle: &title,
		Authors:       mapAuthors(doc.AuthorName),
		ImageURL:      buildImageURL(doc.CoverI),
		ReleaseDate:   formatReleaseDate(doc.FirstPublishYear),
		Description:   extractDescription(doc.FirstSentence),
	}
}

func MapBook(doc books.OlDoc) models.Book {
	return models.Book{
		ID:          extractID(doc.Key),
		Title:       doc.Title,
		ContentType: string(models.ContentTypeBook),
		Authors:     mapAuthors(doc.AuthorName),
		ImageURL:    buildImageURL(doc.CoverI),
		ReleaseDate: formatReleaseDate(doc.FirstPublishYear),
		Pages:       doc.NumberOfPages,
		Description: extractDescription(doc.FirstSentence),
		Images:      buildImages(doc.CoverI),
	}
}
