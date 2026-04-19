package mapper

import (
	"testing"

	"github.com/codeyee/denn-proxy/internal/models"
	"github.com/codeyee/denn-proxy/internal/services/tmdb"
)

func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}

func TestMapSearchItemMovie(t *testing.T) {
	item := tmdb.TmdbSearchResult{
		ID:          123,
		Title:       "Test Movie",
		Overview:    "Overview",
		PosterPath:  stringPtr("/poster.jpg"),
		ReleaseDate: "2023-01-01",
	}

	result := MapSearchItemMovie(item)

	if result.ID != "123" {
		t.Errorf("expected ID '123', got %s", result.ID)
	}
	if result.Type != string(models.ContentTypeMovie) {
		t.Errorf("expected type 'movie', got %s", result.Type)
	}
	if result.Title != "Test Movie" {
		t.Errorf("expected title 'Test Movie', got %s", result.Title)
	}
	if result.ImageURL == nil || *result.ImageURL != tmdb.ImageBaseURL+tmdb.PosterSizeStandard+"/poster.jpg" {
		t.Errorf("expected image URL, got %v", result.ImageURL)
	}
}

func TestMapSearchItemTV(t *testing.T) {
	item := tmdb.TmdbSearchResult{
		ID:           456,
		Name:         "Test Show",
		Overview:     "Overview",
		PosterPath:   stringPtr("/poster.jpg"),
		FirstAirDate: "2023-01-01",
	}

	result := MapSearchItemTV(item)

	if result.ID != "456" {
		t.Errorf("expected ID '456', got %s", result.ID)
	}
	if result.Type != string(models.ContentTypeTVShow) {
		t.Errorf("expected type 'tv', got %s", result.Type)
	}
	if result.Title != "Test Show" {
		t.Errorf("expected title 'Test Show', got %s", result.Title)
	}
	if result.ImageURL == nil || *result.ImageURL != tmdb.ImageBaseURL+tmdb.PosterSizeStandard+"/poster.jpg" {
		t.Errorf("expected image URL, got %v", result.ImageURL)
	}
}

func TestMapMovie(t *testing.T) {
	detail := tmdb.TmdbMovieDetail{
		ID:          123,
		Title:       "Test Movie",
		Overview:    "Overview",
		PosterPath:  stringPtr("/poster.jpg"),
		ReleaseDate: "2023-01-01",
		Runtime:     intPtr(120),
		Status:      "Released",
		ProductionCompanies: []tmdb.TmdbCompany{
			{ID: 1, Name: "Studio 1"},
		},
	}

	result := MapMovie(detail, "US")

	if result.ID != "123" {
		t.Errorf("expected ID '123', got %s", result.ID)
	}
	if result.ContentType != string(models.ContentTypeMovie) {
		t.Errorf("expected type 'movie', got %s", result.ContentType)
	}
	if result.DurationMinutes == nil || *result.DurationMinutes != 120 {
		t.Errorf("expected duration 120, got %v", result.DurationMinutes)
	}
	if len(result.Authors) != 1 || result.Authors[0].Name != "Studio 1" {
		t.Errorf("expected author 'Studio 1', got %v", result.Authors)
	}
}

func TestMapTVShow(t *testing.T) {
	detail := tmdb.TmdbTVDetail{
		ID:               456,
		Name:             "Test Show",
		Overview:         "Overview",
		PosterPath:       stringPtr("/poster.jpg"),
		FirstAirDate:     "2023-01-01",
		NumberOfSeasons:  intPtr(5),
		NumberOfEpisodes: intPtr(50),
		Status:           "Returning Series",
		ProductionCompanies: []tmdb.TmdbCompany{
			{ID: 1, Name: "Network 1"},
		},
	}

	result := MapTVShow(detail, "US")

	if result.ID != "456" {
		t.Errorf("expected ID '456', got %s", result.ID)
	}
	if result.ContentType != string(models.ContentTypeTVShow) {
		t.Errorf("expected type 'tv', got %s", result.ContentType)
	}
	if result.NumberOfSeasons == nil || *result.NumberOfSeasons != 5 {
		t.Errorf("expected 5 seasons, got %v", result.NumberOfSeasons)
	}
	if len(result.Authors) != 1 || result.Authors[0].Name != "Network 1" {
		t.Errorf("expected author 'Network 1', got %v", result.Authors)
	}
}

func TestMapSeason(t *testing.T) {
	detail := tmdb.TmdbSeasonDetail{
		ID:           789,
		SeasonNumber: 1,
		Name:         "Season 1",
		Overview:     "Overview",
		PosterPath:   stringPtr("/season.jpg"),
		AirDate:      "2023-01-01",
		Episodes: []tmdb.TmdbEpisode{
			{
				ID:            101,
				EpisodeNumber: 1,
				Name:          "Pilot",
				Runtime:       intPtr(45),
			},
		},
	}

	result := MapSeason(detail, "Test Show", nil, nil, "US")

	if result.ID != "789" {
		t.Errorf("expected ID '789', got %s", result.ID)
	}
	if result.SeasonNumber != 1 {
		t.Errorf("expected season number 1, got %d", result.SeasonNumber)
	}
	if result.TVShowName == nil || *result.TVShowName != "Test Show" {
		t.Errorf("expected show name 'Test Show', got %v", result.TVShowName)
	}
	if len(result.Episodes) != 1 {
		t.Errorf("expected 1 episode, got %d", len(result.Episodes))
	}
	if result.Episodes[0].Title != "Pilot" {
		t.Errorf("expected episode title 'Pilot', got %s", result.Episodes[0].Title)
	}
}

func TestIsValidSeason(t *testing.T) {
	tests := []struct {
		name     string
		season   tmdb.TmdbSeasonSummary
		expected bool
	}{
		{
			name:     "Valid season",
			season:   tmdb.TmdbSeasonSummary{SeasonNumber: 1, EpisodeCount: 10},
			expected: true,
		},
		{
			name:     "Season 0",
			season:   tmdb.TmdbSeasonSummary{SeasonNumber: 0, EpisodeCount: 10},
			expected: false,
		},
		{
			name:     "No episodes",
			season:   tmdb.TmdbSeasonSummary{SeasonNumber: 1, EpisodeCount: 0},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsValidSeason(tt.season); got != tt.expected {
				t.Errorf("expected %v, got %v", tt.expected, got)
			}
		})
	}
}
