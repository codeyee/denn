package mapper

import (
	"testing"

	"github.com/codeyee/denn-proxy/internal/models"
	"github.com/codeyee/denn-proxy/internal/services/games"
)

func TestBuildIgdbImageURL(t *testing.T) {
	tests := []struct {
		imageID  string
		size     string
		expected *string
	}{
		{"", "720p", nil},
		{"123", "720p", stringPtr("https://images.igdb.com/igdb/image/upload/t_720p/123.jpg")},
	}

	for _, tt := range tests {
		got := buildIgdbImageURL(tt.imageID, tt.size)
		if tt.expected == nil {
			if got != nil {
				t.Errorf("expected nil, got %v", *got)
			}
		} else {
			if got == nil || *got != *tt.expected {
				t.Errorf("expected %v, got %v", *tt.expected, got)
			}
		}
	}
}

func TestFormatReleaseDate(t *testing.T) {
	tests := []struct {
		timestamp int64
		expected  *string
	}{
		{0, nil},
		{1600000000, stringPtr("2020-09-13")},
	}

	for _, tt := range tests {
		got := formatReleaseDate(tt.timestamp)
		if tt.expected == nil {
			if got != nil {
				t.Errorf("expected nil, got %v", *got)
			}
		} else {
			if got == nil || *got != *tt.expected {
				t.Errorf("expected %v, got %v", *tt.expected, got)
			}
		}
	}
}

func TestMapGame(t *testing.T) {
	item := games.IgdbGame{
		ID:   1,
		Name: "Test Game",
		Cover: games.IgdbImage{
			ID:  10,
			Url: "//test.com/img.jpg",
		},
		FirstReleaseDate: 1600000000,
		Genres: []games.IgdbGenre{
			{ID: 1, Name: "RPG"},
		},
		Platforms: []games.IgdbPlatform{
			{ID: 6, Name: "PC"},
		},
	}

	var result models.Game = MapGame(item)

	if result.Title != "Test Game" {
		t.Errorf("expected Title 'Test Game', got %s", result.Title)
	}

	if result.ID != "1" {
		t.Errorf("expected ID '1', got %s", result.ID)
	}

	if len(result.Genres) != 1 || result.Genres[0] != "RPG" {
		t.Errorf("expected Genre RPG, got %v", result.Genres)
	}
}

func TestMapSearchItem(t *testing.T) {
	item := games.IgdbGame{
		ID:   1,
		Name: "Search Game",
		Cover: games.IgdbImage{
			ID:  10,
			Url: "//test.com/img.jpg",
		},
		FirstReleaseDate: 1600000000,
		Summary:          "A short summary",
		InvolvedCompanies: []games.IgdbInvolvedCompany{
			{
				Developer: true,
				Company:   games.IgdbCompany{Name: "Dev Corp"},
			},
		},
	}

	result := MapSearchItem(item)

	if result.Title != "Search Game" {
		t.Errorf("expected Title 'Search Game', got %s", result.Title)
	}

	if result.ID != "1" {
		t.Errorf("expected ID '1', got %s", result.ID)
	}

	if result.Description == nil || *result.Description != "A short summary" {
		t.Errorf("expected Description 'A short summary', got %v", result.Description)
	}

	if len(result.Authors) != 1 || result.Authors[0].Name != "Dev Corp" {
		t.Errorf("expected Author 'Dev Corp', got %v", result.Authors)
	}
}

func TestMapGame_FullDetail(t *testing.T) {
	item := games.IgdbGame{
		ID:    1,
		Name:  "Detailed Game",
		Cover: games.IgdbImage{ImageID: "cover1"},
		Screenshots: []games.IgdbImage{
			{ImageID: "scr1"},
			{ImageID: "scr2"},
			{Url: "//site/scr3.jpg"}, // Test extraction
		},
		Artworks: []games.IgdbImage{
			{ImageID: "art1"},
		},
		Collections: []games.IgdbCollection{
			{Name: "Collection Name"},
		},
		TimeToBeats: &games.IgdbTimeToBeat{
			Hastily:    100,
			Normally:   200,
			Completely: 300,
			Count:      12,
		},
	}

	result := varResult(item)

	// Check Images
	if result.Images == nil {
		t.Fatal("expected Images, got nil")
	}
	if result.Images.PosterStandard == nil || *result.Images.PosterStandard != "https://images.igdb.com/igdb/image/upload/t_720p/cover1.jpg" {
		t.Errorf("incorrect poster standard")
	}
	if result.Images.GalleryStandard == nil || *result.Images.GalleryStandard != "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/scr1.jpg" {
		t.Errorf("incorrect gallery standard")
	}
	if len(result.Images.AdditionalGalleries) != 4 {
		t.Errorf("expected 4 additional galleries, got %d", len(result.Images.AdditionalGalleries))
	}

	// Check Series
	if result.Series == nil || *result.Series != "Collection Name" {
		t.Errorf("expected Series 'Collection Name', got %v", result.Series)
	}

	// Check PlayTime
	if result.PlayTime == nil {
		t.Fatal("expected PlayTime")
	}
	if result.PlayTime.Normally != 200 {
		t.Errorf("expected Normally 200, got %d", result.PlayTime.Normally)
	}
	if result.Duration == nil || result.Duration.Status != "matched" {
		t.Fatalf("expected matched duration, got %#v", result.Duration)
	}
	if result.Duration.HastilySeconds == nil || *result.Duration.HastilySeconds != 100 {
		t.Errorf("expected rushed duration 100 seconds, got %#v", result.Duration.HastilySeconds)
	}
	if result.Duration.SampleCount != 12 {
		t.Errorf("expected sample count 12, got %d", result.Duration.SampleCount)
	}
}

func TestMapGame_TimeToBeatErrorIsNonBlocking(t *testing.T) {
	result := MapGame(games.IgdbGame{
		ID:              1,
		Name:            "Game without duration enrichment",
		TimeToBeatError: true,
	})

	if result.Title != "Game without duration enrichment" {
		t.Fatalf("expected game to remain mapped, got %q", result.Title)
	}
	if result.Duration == nil || result.Duration.Status != "error" {
		t.Fatalf("expected error duration status, got %#v", result.Duration)
	}
}

func TestMapGame_DurationDropsValuesAboveThreeThousandHours(t *testing.T) {
	result := MapGame(games.IgdbGame{
		ID:   1,
		Name: "Service Game",
		TimeToBeats: &games.IgdbTimeToBeat{
			Hastily:    10 * 60 * 60,
			Normally:   3001 * 60 * 60,
			Completely: 20 * 60 * 60,
		},
	})

	if result.Duration == nil || result.Duration.Status != "matched" {
		t.Fatalf("expected matched duration, got %#v", result.Duration)
	}
	if result.Duration.HastilySeconds == nil || *result.Duration.HastilySeconds != 10*60*60 {
		t.Errorf("expected rushed duration to be kept, got %#v", result.Duration.HastilySeconds)
	}
	if result.Duration.NormallySeconds != nil {
		t.Errorf("expected normal outlier to be discarded, got %d", *result.Duration.NormallySeconds)
	}
	if result.Duration.CompletelySeconds == nil || *result.Duration.CompletelySeconds != 20*60*60 {
		t.Errorf("expected complete duration to be kept, got %#v", result.Duration.CompletelySeconds)
	}
}

func TestMapGame_DurationKeepsNormalWhenValuesContradict(t *testing.T) {
	result := MapGame(games.IgdbGame{
		ID:   1,
		Name: "Contradictory Game",
		TimeToBeats: &games.IgdbTimeToBeat{
			Hastily:    100 * 60 * 60,
			Normally:   50 * 60 * 60,
			Completely: 200 * 60 * 60,
		},
	})

	if result.Duration == nil || result.Duration.Status != "matched" {
		t.Fatalf("expected matched duration, got %#v", result.Duration)
	}
	if result.Duration.HastilySeconds != nil {
		t.Errorf("expected rushed duration to be discarded, got %#v", result.Duration.HastilySeconds)
	}
	if result.Duration.NormallySeconds == nil || *result.Duration.NormallySeconds != 50*60*60 {
		t.Errorf("expected normal duration to be kept, got %#v", result.Duration.NormallySeconds)
	}
	if result.Duration.CompletelySeconds != nil {
		t.Errorf("expected complete duration to be discarded, got %#v", result.Duration.CompletelySeconds)
	}
}

func varResult(item games.IgdbGame) models.Game {
	return MapGame(item)
}

func stringPtr(s string) *string {
	return &s
}
