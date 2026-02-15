package tmdb

import (
	"testing"

	"github.com/codeyee/denn-proxy/internal/models"
)

func TestBuildImageURL(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		size     string
		expected string
	}{
		{"Poster Standard", "/path.jpg", posterSizeStandard, imageBaseURL + posterSizeStandard + "/path.jpg"},
		{"Backdrop Original", "/back.jpg", gallerySizeOriginal, imageBaseURL + gallerySizeOriginal + "/back.jpg"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildImageURL(tt.path, tt.size)
			if got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, got)
			}
		})
	}
}

func intPtr(i int) *int {
	return &i
}

func TestMapSearchItemMovie(t *testing.T) {
	tests := []struct {
		name          string
		input         tmdbSearchResult
		expectedTitle string
		expectedDate  string
	}{
		{
			name: "Standard Movie",
			input: tmdbSearchResult{
				ID:          1,
				Title:       "Test Movie",
				ReleaseDate: "2023-01-01",
				PosterPath:  strPtr("/poster.jpg"),
			},
			expectedTitle: "Test Movie",
			expectedDate:  "2023-01-01",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := mapSearchItemMovie(tt.input)
			if result.Title != tt.expectedTitle {
				t.Errorf("expected title %q, got %q", tt.expectedTitle, result.Title)
			}
			if result.ReleaseDate == nil || *result.ReleaseDate != tt.expectedDate {
				t.Errorf("expected date %q, got %v", tt.expectedDate, result.ReleaseDate)
			}
			if result.Type != string(models.ContentTypeMovie) {
				t.Errorf("expected type %q, got %q", models.ContentTypeMovie, result.Type)
			}
		})
	}
}

func TestMapSearchItemTV(t *testing.T) {
	tests := []struct {
		name          string
		input         tmdbSearchResult
		expectedTitle string
		expectedDate  string
	}{
		{
			name: "Standard TV Show",
			input: tmdbSearchResult{
				ID:           1,
				Name:         "Test Show",
				FirstAirDate: "2023-01-01",
				PosterPath:   strPtr("/poster.jpg"),
			},
			expectedTitle: "Test Show",
			expectedDate:  "2023-01-01",
		},
		{
			name: "Fallback Title",
			input: tmdbSearchResult{
				ID:          2,
				Title:       "Fallback Title",
				ReleaseDate: "2022-02-02",
			},
			expectedTitle: "Fallback Title",
			expectedDate:  "2022-02-02",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := mapSearchItemTV(tt.input)
			if result.Title != tt.expectedTitle {
				t.Errorf("expected title %q, got %q", tt.expectedTitle, result.Title)
			}
			if result.ReleaseDate == nil || *result.ReleaseDate != tt.expectedDate {
				t.Errorf("expected date %q, got %v", tt.expectedDate, result.ReleaseDate)
			}
			if result.Type != string(models.ContentTypeTVShow) {
				t.Errorf("expected type %q, got %q", models.ContentTypeTVShow, result.Type)
			}
		})
	}
}

func TestMapMovie(t *testing.T) {
	detail := tmdbMovieDetail{
		ID:            123,
		Title:         "Full Movie",
		OriginalTitle: "Org Title",
		Overview:      "Overview text",
		PosterPath:    strPtr("/p.jpg"),
		BackdropPath:  strPtr("/b.jpg"),
		ReleaseDate:   "2023-10-10",
		Runtime:       intPtr(120),
		Status:        "Released",
		ProductionCompanies: []tmdbCompany{
			{Name: "Studio A"},
		},
		Images: &tmdbImagesResponse{
			Backdrops: []tmdbImage{
				{FilePath: "/b2.jpg"},
			},
		},
	}

	result := mapMovie(detail, "US")

	if result.ID != "123" {
		t.Errorf("expected ID 123, got %s", result.ID)
	}
	if result.Title != "Full Movie" {
		t.Errorf("expected Title 'Full Movie', got %s", result.Title)
	}
	if result.DurationMinutes == nil || *result.DurationMinutes != 120 {
		t.Errorf("expected Duration 120, got %v", result.DurationMinutes)
	}
	if len(result.Authors) != 1 || result.Authors[0].Name != "Studio A" {
		t.Errorf("expected Author 'Studio A', got %v", result.Authors)
	}
	if result.Images == nil {
		t.Fatal("expected Images struct")
	}
	// b.jpg is excluded from additional galleries because it's the main backdrop
	// b2.jpg should be there
	if len(result.Images.AdditionalGalleries) != 1 {
		t.Errorf("expected 1 additional gallery, got %d", len(result.Images.AdditionalGalleries))
	}
}

func TestIsValidSeason(t *testing.T) {
	tests := []struct {
		name     string
		input    tmdbSeasonSummary
		expected bool
	}{
		{"Valid", tmdbSeasonSummary{SeasonNumber: 1, EpisodeCount: 10}, true},
		{"Season 0", tmdbSeasonSummary{SeasonNumber: 0, EpisodeCount: 10}, false},
		{"No Episodes", tmdbSeasonSummary{SeasonNumber: 1, EpisodeCount: 0}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isValidSeason(tt.input); got != tt.expected {
				t.Errorf("expected %v, got %v", tt.expected, got)
			}
		})
	}
}
