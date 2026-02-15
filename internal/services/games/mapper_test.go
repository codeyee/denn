package games

import (
	"testing"
	"time"

	"github.com/codeyee/denn-proxy/internal/models"
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

func TestCalculateRecencyMultiplier(t *testing.T) {
	now := time.Now().Unix()
	day := int64(86400)

	tests := []struct {
		name        string
		releaseDate *string
		expected    float64
	}{
		{"Nil date", nil, 1.0},
		{"Future date", stringPtr(time.Unix(now+day, 0).Format("2006-01-02")), 0.0},
		{"Just released", stringPtr(time.Unix(now-day, 0).Format("2006-01-02")), MaxRecencyBoost},
		{"60 days old", stringPtr(time.Unix(now-(60*day), 0).Format("2006-01-02")), MaxRecencyBoost * 0.6},
		{"Old game", stringPtr("2000-01-01"), 1.0},
	}

	for _, tt := range tests {
		got := calculateRecencyMultiplier(tt.releaseDate, now)
		// Float comparison with epsilon
		if abs(got-tt.expected) > 0.001 {
			t.Errorf("%s: expected %v, got %v", tt.name, tt.expected, got)
		}
	}
}

func TestMapGame(t *testing.T) {
	item := igdbGame{
		ID:   1,
		Name: "Test Game",
		Cover: igdbImage{
			ID:  10,
			Url: "//test.com/img.jpg",
		},
		FirstReleaseDate: 1600000000,
		Genres: []igdbGenre{
			{ID: 1, Name: "RPG"},
		},
		Platforms: []igdbPlatform{
			{ID: 6, Name: "PC"},
		},
	}

	var result models.Game = mapGame(item)

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
	item := igdbGame{
		ID:   1,
		Name: "Search Game",
		Cover: igdbImage{
			ID:  10,
			Url: "//test.com/img.jpg",
		},
		FirstReleaseDate: 1600000000,
		Summary: "A short summary",
		InvolvedCompanies: []igdbInvolvedCompany{
			{
				Developer: true,
				Company:   igdbCompany{Name: "Dev Corp"},
			},
		},
	}

	result := mapSearchItem(item)

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
	item := igdbGame{
		ID:   1,
		Name: "Detailed Game",
		Cover: igdbImage{ImageID: "cover1"},
		Screenshots: []igdbImage{
			{ImageID: "scr1"},
			{ImageID: "scr2"},
			{Url: "//site/scr3.jpg"}, // Test extraction
		},
		Artworks: []igdbImage{
			{ImageID: "art1"},
		},
		Collections: []igdbCollection{
			{Name: "Collection Name"},
		},
		TimeToBeats: &igdbTimeToBeat{
			Hastily: 100,
			Normally: 200,
			Completely: 300,
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
}

func varResult(item igdbGame) models.Game {
	return mapGame(item)
}

func stringPtr(s string) *string {
	return &s
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}
