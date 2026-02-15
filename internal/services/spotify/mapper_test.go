package spotify

import (
	"testing"

	"github.com/codeyee/denn-proxy/internal/models"
)

func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}

func TestGetImageURL(t *testing.T) {
	images := []spotifyImage{
		{URL: "https://large.jpg", Height: 640, Width: 640},
		{URL: "https://medium.jpg", Height: 300, Width: 300},
		{URL: "https://small.jpg", Height: 64, Width: 64},
	}

	tests := []struct {
		name     string
		images   []spotifyImage
		size     string
		expected *string
	}{
		{"Large", images, "large", stringPtr("https://large.jpg")},
		{"Medium", images, "medium", stringPtr("https://medium.jpg")},
		{"Small", images, "small", stringPtr("https://small.jpg")},
		{"Default", images, "other", stringPtr("https://large.jpg")},
		{"Empty", nil, "large", nil},
		{"Empty slice", []spotifyImage{}, "large", nil},
		{"Single image medium", images[:1], "medium", stringPtr("https://large.jpg")},
		{"Two images small", images[:2], "small", stringPtr("https://large.jpg")},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := getImageURL(tt.images, tt.size)
			if tt.expected == nil {
				if got != nil {
					t.Errorf("expected nil, got %v", *got)
				}
			} else if got == nil || *got != *tt.expected {
				t.Errorf("expected %v, got %v", *tt.expected, got)
			}
		})
	}
}

func TestBuildImages(t *testing.T) {
	t.Run("Multiple images", func(t *testing.T) {
		images := []spotifyImage{
			{URL: "https://large.jpg", Height: 640, Width: 640},
			{URL: "https://medium.jpg", Height: 300, Width: 300},
		}

		result := buildImages(images)

		if result == nil {
			t.Fatal("expected non-nil Images")
		}
		if result.PosterStandard == nil || *result.PosterStandard != "https://medium.jpg" {
			t.Errorf("expected PosterStandard 'https://medium.jpg', got %v", result.PosterStandard)
		}
		if result.PosterOriginal == nil || *result.PosterOriginal != "https://large.jpg" {
			t.Errorf("expected PosterOriginal 'https://large.jpg', got %v", result.PosterOriginal)
		}
	})

	t.Run("No images", func(t *testing.T) {
		result := buildImages(nil)
		if result != nil {
			t.Errorf("expected nil, got %v", result)
		}
	})

	t.Run("Empty images", func(t *testing.T) {
		result := buildImages([]spotifyImage{})
		if result != nil {
			t.Errorf("expected nil, got %v", result)
		}
	})
}

func TestMapArtists(t *testing.T) {
	tests := []struct {
		name     string
		artists  []spotifyArtist
		expected int
	}{
		{"Single artist", []spotifyArtist{{Name: "Radiohead"}}, 1},
		{"Multiple artists", []spotifyArtist{{Name: "A"}, {Name: "B"}, {Name: "C"}}, 3},
		{"Empty name filtered", []spotifyArtist{{Name: ""}, {Name: "Valid"}}, 1},
		{"All empty", []spotifyArtist{{Name: ""}}, 0},
		{"Nil", nil, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := mapArtists(tt.artists)
			if tt.expected == 0 {
				if got != nil {
					t.Errorf("expected nil, got %v", got)
				}
			} else {
				if len(got) != tt.expected {
					t.Errorf("expected %d authors, got %d", tt.expected, len(got))
				}
				for _, a := range got {
					if a.Type != string(models.AuthorTypeArtist) {
						t.Errorf("expected type %q, got %q", models.AuthorTypeArtist, a.Type)
					}
				}
			}
		})
	}
}

func TestNormalizeReleaseDate(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected *string
	}{
		{"Full date", "2023-10-15", stringPtr("2023-10-15")},
		{"Year-month", "2023-10", stringPtr("2023-10-01")},
		{"Year only", "2023", stringPtr("2023-01-01")},
		{"Empty", "", nil},
		{"Invalid length", "20", nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeReleaseDate(tt.input)
			if tt.expected == nil {
				if got != nil {
					t.Errorf("expected nil, got %v", *got)
				}
			} else if got == nil || *got != *tt.expected {
				t.Errorf("expected %v, got %v", *tt.expected, got)
			}
		})
	}
}

func TestDeriveAlbumType(t *testing.T) {
	tests := []struct {
		name            string
		totalTracks     int
		durationMinutes *int
		expected        string
	}{
		{"Album by duration", 5, intPtr(35), string(models.AlbumTypeAlbum)},
		{"Album by tracks", 8, intPtr(25), string(models.AlbumTypeAlbum)},
		{"Album exactly 7 tracks", 7, nil, string(models.AlbumTypeAlbum)},
		{"EP 4 tracks", 4, intPtr(15), string(models.AlbumTypeEP)},
		{"EP 6 tracks", 6, intPtr(20), string(models.AlbumTypeEP)},
		{"Single 3 tracks", 3, intPtr(10), string(models.AlbumTypeSingle)},
		{"Single 1 track", 1, nil, string(models.AlbumTypeSingle)},
		{"EP nil duration", 5, nil, string(models.AlbumTypeEP)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := deriveAlbumType(tt.totalTracks, tt.durationMinutes)
			if got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, got)
			}
		})
	}
}

func TestMapTrack(t *testing.T) {
	track := spotifyTrack{
		ID:          "track1",
		Name:        "Creep",
		TrackNumber: 2,
		DurationMs:  238000,
		Artists:     []spotifyArtist{{Name: "Radiohead"}},
		ExternalURLs: spotifyExternalURLs{Spotify: "https://open.spotify.com/track/track1"},
	}

	result := mapTrack(track)

	if result.ID != "track1" {
		t.Errorf("expected ID 'track1', got %s", result.ID)
	}
	if result.Title != "Creep" {
		t.Errorf("expected Title 'Creep', got %s", result.Title)
	}
	if result.TrackNumber != 2 {
		t.Errorf("expected TrackNumber 2, got %d", result.TrackNumber)
	}
	if result.DurationSeconds == nil || *result.DurationSeconds != 238 {
		t.Errorf("expected DurationSeconds 238, got %v", result.DurationSeconds)
	}
	if result.ExternalURL == nil || *result.ExternalURL != "https://open.spotify.com/track/track1" {
		t.Errorf("expected ExternalURL, got %v", result.ExternalURL)
	}
	if len(result.Authors) != 1 || result.Authors[0].Name != "Radiohead" {
		t.Errorf("expected author 'Radiohead', got %v", result.Authors)
	}
}

func TestMapTrack_ZeroDuration(t *testing.T) {
	track := spotifyTrack{
		ID:          "track2",
		Name:        "Intro",
		TrackNumber: 1,
		DurationMs:  0,
	}

	result := mapTrack(track)

	if result.DurationSeconds != nil {
		t.Errorf("expected nil DurationSeconds, got %v", *result.DurationSeconds)
	}
	if result.ExternalURL != nil {
		t.Errorf("expected nil ExternalURL, got %v", *result.ExternalURL)
	}
}

func TestMapSearchItem(t *testing.T) {
	album := spotifyAlbum{
		ID:          "album1",
		Name:        "OK Computer",
		AlbumType:   "album",
		TotalTracks: 12,
		ReleaseDate: "1997-05-21",
		Images:      []spotifyImage{{URL: "https://cover.jpg", Height: 640, Width: 640}},
		Artists:     []spotifyArtist{{Name: "Radiohead"}},
	}

	result := mapSearchItem(album)

	if result.ID != "album1" {
		t.Errorf("expected ID 'album1', got %s", result.ID)
	}
	if result.Type != string(models.ContentTypeAlbum) {
		t.Errorf("expected type %q, got %q", models.ContentTypeAlbum, result.Type)
	}
	if result.Title != "OK Computer" {
		t.Errorf("expected title 'OK Computer', got %s", result.Title)
	}
	if result.ReleaseDate == nil || *result.ReleaseDate != "1997-05-21" {
		t.Errorf("expected release date '1997-05-21', got %v", result.ReleaseDate)
	}
	if result.ImageURL == nil || *result.ImageURL != "https://cover.jpg" {
		t.Errorf("expected image URL, got %v", result.ImageURL)
	}
	if len(result.Authors) != 1 || result.Authors[0].Name != "Radiohead" {
		t.Errorf("expected author 'Radiohead', got %v", result.Authors)
	}
}

func TestMapAlbumDetail(t *testing.T) {
	album := spotifyAlbum{
		ID:          "album1",
		Name:        "OK Computer",
		AlbumType:   "album",
		TotalTracks: 12,
		ReleaseDate: "1997-05-21",
		Images: []spotifyImage{
			{URL: "https://large.jpg", Height: 640, Width: 640},
			{URL: "https://medium.jpg", Height: 300, Width: 300},
		},
		Artists:      []spotifyArtist{{Name: "Radiohead"}},
		ExternalURLs: spotifyExternalURLs{Spotify: "https://open.spotify.com/album/album1"},
		Tracks: &spotifyTrackPage{
			Items: []spotifyTrack{
				{ID: "t1", Name: "Track 1", TrackNumber: 1, DurationMs: 240000},
				{ID: "t2", Name: "Track 2", TrackNumber: 2, DurationMs: 180000},
			},
		},
	}

	result := mapAlbumDetail(album)

	if result.ID != "album1" {
		t.Errorf("expected ID 'album1', got %s", result.ID)
	}
	if result.ContentType != string(models.ContentTypeAlbum) {
		t.Errorf("expected type %q, got %q", models.ContentTypeAlbum, result.ContentType)
	}
	if result.Title != "OK Computer" {
		t.Errorf("expected title 'OK Computer', got %s", result.Title)
	}
	if len(result.Tracks) != 2 {
		t.Errorf("expected 2 tracks, got %d", len(result.Tracks))
	}
	// 240 + 180 = 420 seconds = 7 minutes
	if result.DurationMinutes == nil || *result.DurationMinutes != 7 {
		t.Errorf("expected DurationMinutes 7, got %v", result.DurationMinutes)
	}
	if result.AlbumType == nil || *result.AlbumType != string(models.AlbumTypeAlbum) {
		t.Errorf("expected album type 'album', got %v", result.AlbumType)
	}
	if result.ExternalURL == nil || *result.ExternalURL != "https://open.spotify.com/album/album1" {
		t.Errorf("expected ExternalURL, got %v", result.ExternalURL)
	}
	if result.Images == nil {
		t.Fatal("expected Images, got nil")
	}
	if result.Images.PosterOriginal == nil || *result.Images.PosterOriginal != "https://large.jpg" {
		t.Errorf("expected PosterOriginal 'https://large.jpg', got %v", result.Images.PosterOriginal)
	}
}

func TestMapAlbumDetail_NoTracks(t *testing.T) {
	album := spotifyAlbum{
		ID:          "album2",
		Name:        "Empty Album",
		TotalTracks: 0,
		ReleaseDate: "2023",
	}

	result := mapAlbumDetail(album)

	if result.DurationMinutes != nil {
		t.Errorf("expected nil DurationMinutes, got %v", *result.DurationMinutes)
	}
	if result.AlbumType == nil || *result.AlbumType != string(models.AlbumTypeSingle) {
		t.Errorf("expected album type 'single' for 0 tracks, got %v", result.AlbumType)
	}
	if result.ReleaseDate == nil || *result.ReleaseDate != "2023-01-01" {
		t.Errorf("expected normalized release date '2023-01-01', got %v", result.ReleaseDate)
	}
}
