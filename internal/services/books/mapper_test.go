package books

import (
	"testing"

	"github.com/codeyee/denn-proxy/internal/models"
	"github.com/codeyee/denn-proxy/internal/providers/openlibrary"
)

func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}

func TestBuildCoverURL(t *testing.T) {
	tests := []struct {
		name     string
		coverID  int
		size     string
		expected string
	}{
		{"Medium", 12345, "M", openlibrary.CoversURL + "/b/id/12345-M.jpg"},
		{"Large", 12345, "L", openlibrary.CoversURL + "/b/id/12345-L.jpg"},
		{"Small", 99, "S", openlibrary.CoversURL + "/b/id/99-S.jpg"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildCoverURL(tt.coverID, tt.size)
			if got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, got)
			}
		})
	}
}

func TestBuildImages(t *testing.T) {
	t.Run("With cover ID", func(t *testing.T) {
		result := buildImages(intPtr(12345))

		if result == nil {
			t.Fatal("expected non-nil Images")
		}
		if result.PosterStandard == nil {
			t.Fatal("expected non-nil PosterStandard")
		}
		if *result.PosterStandard != openlibrary.CoversURL+"/b/id/12345-M.jpg" {
			t.Errorf("expected medium cover URL, got %s", *result.PosterStandard)
		}
		if result.PosterOriginal == nil {
			t.Fatal("expected non-nil PosterOriginal")
		}
		if *result.PosterOriginal != openlibrary.CoversURL+"/b/id/12345-L.jpg" {
			t.Errorf("expected large cover URL, got %s", *result.PosterOriginal)
		}
	})

	t.Run("Nil cover ID", func(t *testing.T) {
		result := buildImages(nil)
		if result != nil {
			t.Errorf("expected nil, got %v", result)
		}
	})
}

func TestBuildImageURL(t *testing.T) {
	t.Run("With cover ID", func(t *testing.T) {
		result := buildImageURL(intPtr(12345))
		if result == nil {
			t.Fatal("expected non-nil URL")
		}
		if *result != openlibrary.CoversURL+"/b/id/12345-L.jpg" {
			t.Errorf("expected large cover URL, got %s", *result)
		}
	})

	t.Run("Nil cover ID", func(t *testing.T) {
		result := buildImageURL(nil)
		if result != nil {
			t.Errorf("expected nil, got %v", *result)
		}
	})
}

func TestExtractID(t *testing.T) {
	tests := []struct {
		name     string
		key      string
		expected string
	}{
		{"Full path", "/works/OL274505W", "OL274505W"},
		{"Nested path", "/authors/OL12345A", "OL12345A"},
		{"No slash", "OL274505W", "OL274505W"},
		{"Empty", "", ""},
		{"Trailing slash", "/works/", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractID(tt.key)
			if got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, got)
			}
		})
	}
}

func TestMapAuthors(t *testing.T) {
	tests := []struct {
		name     string
		names    []string
		expected int
	}{
		{"Single author", []string{"J.K. Rowling"}, 1},
		{"Multiple authors", []string{"Author A", "Author B", "Author C"}, 3},
		{"Empty name filtered", []string{"", "Valid Author"}, 1},
		{"All empty", []string{""}, 0},
		{"Nil", nil, 0},
		{"Empty slice", []string{}, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := mapAuthors(tt.names)
			if tt.expected == 0 {
				if got != nil {
					t.Errorf("expected nil, got %v", got)
				}
			} else {
				if len(got) != tt.expected {
					t.Errorf("expected %d authors, got %d", tt.expected, len(got))
				}
				for _, a := range got {
					if a.Type != string(models.AuthorTypeAuthor) {
						t.Errorf("expected type %q, got %q", models.AuthorTypeAuthor, a.Type)
					}
				}
			}
		})
	}
}

func TestExtractDescription(t *testing.T) {
	tests := []struct {
		name     string
		input    []string
		expected *string
	}{
		{"Has sentence", []string{"Once upon a time..."}, stringPtr("Once upon a time...")},
		{"Multiple sentences", []string{"First.", "Second."}, stringPtr("First.")},
		{"Empty first", []string{""}, nil},
		{"Nil", nil, nil},
		{"Empty slice", []string{}, nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractDescription(tt.input)
			if tt.expected == nil {
				if got != nil {
					t.Errorf("expected nil, got %q", *got)
				}
			} else if got == nil || *got != *tt.expected {
				t.Errorf("expected %q, got %v", *tt.expected, got)
			}
		})
	}
}

func TestFormatReleaseDate(t *testing.T) {
	tests := []struct {
		name     string
		year     *int
		expected *string
	}{
		{"Valid year", intPtr(1997), stringPtr("1997")},
		{"Recent year", intPtr(2024), stringPtr("2024")},
		{"Nil year", nil, nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := formatReleaseDate(tt.year)
			if tt.expected == nil {
				if got != nil {
					t.Errorf("expected nil, got %q", *got)
				}
			} else if got == nil || *got != *tt.expected {
				t.Errorf("expected %q, got %v", *tt.expected, got)
			}
		})
	}
}

func TestMapSearchItem(t *testing.T) {
	doc := olDoc{
		Key:              "/works/OL274505W",
		Title:            "Harry Potter and the Philosopher's Stone",
		AuthorName:       []string{"J.K. Rowling"},
		CoverI:           intPtr(12345),
		FirstPublishYear: intPtr(1997),
		FirstSentence:    []string{"Mr and Mrs Dursley, of number four, Privet Drive, were proud to say that they were perfectly normal, thank you very much."},
	}

	result := mapSearchItem(doc)

	if result.ID != "OL274505W" {
		t.Errorf("expected ID 'OL274505W', got %s", result.ID)
	}
	if result.Type != string(models.ContentTypeBook) {
		t.Errorf("expected type %q, got %q", models.ContentTypeBook, result.Type)
	}
	if result.Title != "Harry Potter and the Philosopher's Stone" {
		t.Errorf("expected title, got %s", result.Title)
	}
	if result.OriginalTitle == nil || *result.OriginalTitle != result.Title {
		t.Errorf("expected original_title to match title")
	}
	if len(result.Authors) != 1 || result.Authors[0].Name != "J.K. Rowling" {
		t.Errorf("expected author 'J.K. Rowling', got %v", result.Authors)
	}
	if result.ImageURL == nil {
		t.Error("expected non-nil ImageURL")
	}
	if result.ReleaseDate == nil || *result.ReleaseDate != "1997" {
		t.Errorf("expected release date '1997', got %v", result.ReleaseDate)
	}
	if result.Description == nil {
		t.Error("expected non-nil Description")
	}
}

func TestMapSearchItem_MinimalData(t *testing.T) {
	doc := olDoc{
		Key:   "/works/OL1W",
		Title: "Unknown Book",
	}

	result := mapSearchItem(doc)

	if result.ID != "OL1W" {
		t.Errorf("expected ID 'OL1W', got %s", result.ID)
	}
	if result.Title != "Unknown Book" {
		t.Errorf("expected title 'Unknown Book', got %s", result.Title)
	}
	if result.Authors != nil {
		t.Errorf("expected nil Authors, got %v", result.Authors)
	}
	if result.ImageURL != nil {
		t.Errorf("expected nil ImageURL, got %v", *result.ImageURL)
	}
	if result.ReleaseDate != nil {
		t.Errorf("expected nil ReleaseDate, got %v", *result.ReleaseDate)
	}
	if result.Description != nil {
		t.Errorf("expected nil Description, got %v", *result.Description)
	}
}

func TestMapBook(t *testing.T) {
	doc := olDoc{
		Key:              "/works/OL274505W",
		Title:            "Harry Potter and the Philosopher's Stone",
		AuthorName:       []string{"J.K. Rowling"},
		CoverI:           intPtr(12345),
		FirstPublishYear: intPtr(1997),
		FirstSentence:    []string{"Mr and Mrs Dursley..."},
		NumberOfPages:    intPtr(309),
	}

	result := mapBook(doc)

	if result.ID != "OL274505W" {
		t.Errorf("expected ID 'OL274505W', got %s", result.ID)
	}
	if result.ContentType != string(models.ContentTypeBook) {
		t.Errorf("expected type %q, got %q", models.ContentTypeBook, result.ContentType)
	}
	if result.Title != "Harry Potter and the Philosopher's Stone" {
		t.Errorf("expected title, got %s", result.Title)
	}
	if len(result.Authors) != 1 || result.Authors[0].Name != "J.K. Rowling" {
		t.Errorf("expected author 'J.K. Rowling', got %v", result.Authors)
	}
	if result.Pages == nil || *result.Pages != 309 {
		t.Errorf("expected 309 pages, got %v", result.Pages)
	}
	if result.Images == nil {
		t.Fatal("expected non-nil Images")
	}
	if result.Images.PosterStandard == nil {
		t.Error("expected non-nil PosterStandard")
	}
	if result.Images.PosterOriginal == nil {
		t.Error("expected non-nil PosterOriginal")
	}
	if result.Description == nil || *result.Description != "Mr and Mrs Dursley..." {
		t.Errorf("expected description, got %v", result.Description)
	}
	if result.ReleaseDate == nil || *result.ReleaseDate != "1997" {
		t.Errorf("expected release date '1997', got %v", result.ReleaseDate)
	}
}

func TestMapBook_NoCover(t *testing.T) {
	doc := olDoc{
		Key:   "/works/OL1W",
		Title: "No Cover Book",
	}

	result := mapBook(doc)

	if result.ImageURL != nil {
		t.Errorf("expected nil ImageURL, got %v", *result.ImageURL)
	}
	if result.Images != nil {
		t.Errorf("expected nil Images, got %v", result.Images)
	}
	if result.Pages != nil {
		t.Errorf("expected nil Pages, got %v", *result.Pages)
	}
}
