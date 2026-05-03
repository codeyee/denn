package common

import (
	"testing"
	"time"

	"github.com/codeyee/denn-proxy/internal/models"
)

func stringPtr(s string) *string {
	return &s
}

func TestNormalizeSearchCacheKey(t *testing.T) {
	if got := NormalizeSearchCacheKey("  Matrix  "); got != "matrix" {
		t.Fatalf("expected matrix, got %q", got)
	}
}

func TestIsGeneralReleaseEligible(t *testing.T) {
	now := time.Date(2026, 5, 2, 0, 0, 0, 0, time.UTC)

	if IsGeneralReleaseEligible(nil, now) {
		t.Fatal("nil release date must be ineligible")
	}
	if !IsGeneralReleaseEligible(stringPtr("2026-05-03"), now) {
		t.Fatal("one-day future grace window must stay eligible")
	}
	if IsGeneralReleaseEligible(stringPtr("2026-05-05"), now) {
		t.Fatal("future dates outside the grace window must be filtered")
	}
}

func TestIsValidSeasonContent(t *testing.T) {
	now := time.Date(2026, 5, 2, 0, 0, 0, 0, time.UTC)

	valid := models.Season{
		SeasonNumber:     1,
		NumberOfEpisodes: 2,
		ReleaseDate:      stringPtr("2026-04-01"),
		Episodes: []models.Episode{
			{ReleaseDate: stringPtr("2026-04-01")},
			{ReleaseDate: stringPtr("2026-04-08")},
		},
	}
	if !IsValidSeasonContent(valid, now) {
		t.Fatal("expected season with released episodes to stay visible")
	}

	invalid := models.Season{
		SeasonNumber:     1,
		NumberOfEpisodes: 1,
		ReleaseDate:      stringPtr("2026-04-01"),
		Episodes: []models.Episode{
			{ReleaseDate: nil},
		},
	}
	if IsValidSeasonContent(invalid, now) {
		t.Fatal("single-episode season without a release date must be filtered")
	}
}
