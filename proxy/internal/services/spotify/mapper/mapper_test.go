package mapper

import (
	"testing"

	"github.com/codeyee/denn-proxy/internal/models"
	"github.com/codeyee/denn-proxy/internal/services/spotify"
)

func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}

func TestGetImageURL(t *testing.T) {
	tests := []struct {
		name     string
		images   []spotify.SpotifyImage
		size     string
		expected *string
	}{
		{
			name:     "Empty images",
			images:   []spotify.SpotifyImage{},
			size:     "large",
			expected: nil,
		},
		{
			name: "Single image - any size returns it",
			images: []spotify.SpotifyImage{
				{URL: "http://example.com/1.jpg", Width: 640},
			},
			size:     "small",
			expected: stringPtr("http://example.com/1.jpg"),
		},
		{
			name: "Multiple images - large returns first",
			images: []spotify.SpotifyImage{
				{URL: "http://example.com/1.jpg", Width: 640},
				{URL: "http://example.com/2.jpg", Width: 300},
				{URL: "http://example.com/3.jpg", Width: 64},
			},
			size:     "large",
			expected: stringPtr("http://example.com/1.jpg"),
		},
		{
			name: "Multiple images - medium returns second",
			images: []spotify.SpotifyImage{
				{URL: "http://example.com/1.jpg", Width: 640},
				{URL: "http://example.com/2.jpg", Width: 300},
				{URL: "http://example.com/3.jpg", Width: 64},
			},
			size:     "medium",
			expected: stringPtr("http://example.com/2.jpg"),
		},
		{
			name: "Multiple images - small returns third",
			images: []spotify.SpotifyImage{
				{URL: "http://example.com/1.jpg", Width: 640},
				{URL: "http://example.com/2.jpg", Width: 300},
				{URL: "http://example.com/3.jpg", Width: 64},
			},
			size:     "small",
			expected: stringPtr("http://example.com/3.jpg"),
		},
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
	tests := []struct {
		name     string
		images   []spotify.SpotifyImage
		expected bool // true if non-nil
	}{
		{
			name:     "Empty images",
			images:   []spotify.SpotifyImage{},
			expected: false,
		},
		{
			name: "Valid images",
			images: []spotify.SpotifyImage{
				{URL: "http://example.com/1.jpg", Width: 640},
				{URL: "http://example.com/2.jpg", Width: 300},
			},
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildImages(tt.images)
			if tt.expected {
				if got == nil {
					t.Error("expected non-nil Images")
				}
			} else {
				if got != nil {
					t.Errorf("expected nil, got %v", got)
				}
			}
		})
	}
}

func TestMapArtists(t *testing.T) {
	tests := []struct {
		name     string
		artists  []spotify.SpotifyArtist
		expected int
	}{
		{
			name:     "Empty",
			artists:  []spotify.SpotifyArtist{},
			expected: 0,
		},
		{
			name: "Valid artists",
			artists: []spotify.SpotifyArtist{
				{Name: "Artist 1"},
				{Name: "Artist 2"},
			},
			expected: 2,
		},
		{
			name: "Empty name",
			artists: []spotify.SpotifyArtist{
				{Name: ""},
				{Name: "Artist 2"},
			},
			expected: 1,
		},
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
						t.Errorf("expected type %s, got %s", models.AuthorTypeArtist, a.Type)
					}
				}
			}
		})
	}
}

func TestMapTrack(t *testing.T) {
	track := spotify.SpotifyTrack{
		ID:          "t1",
		Name:        "Track 1",
		TrackNumber: 1,
		DurationMs:  180000,
		Artists: []spotify.SpotifyArtist{
			{Name: "Artist 1"},
		},
		ExternalURLs: spotify.SpotifyExternalURLs{
			Spotify: "http://spotify.com/track/1",
		},
	}

	result := mapTrack(track)

	if result.ID != "t1" {
		t.Errorf("expected ID 't1', got %s", result.ID)
	}
	if result.Title != "Track 1" {
		t.Errorf("expected title 'Track 1', got %s", result.Title)
	}
	if result.DurationSeconds == nil || *result.DurationSeconds != 180 {
		t.Errorf("expected duration 180, got %v", result.DurationSeconds)
	}
	if result.ExternalURL == nil || *result.ExternalURL != "http://spotify.com/track/1" {
		t.Errorf("expected external URL, got %v", result.ExternalURL)
	}
}

func TestMapSearchItem(t *testing.T) {
	album := spotify.SpotifyAlbum{
		ID:          "a1",
		Name:        "Album 1",
		AlbumType:   "album",
		ReleaseDate: "2023-01-01",
		Artists: []spotify.SpotifyArtist{
			{Name: "Artist 1"},
		},
		Images: []spotify.SpotifyImage{
			{URL: "http://example.com/1.jpg", Width: 640},
		},
	}

	result := MapSearchItem(album)

	if result.ID != "a1" {
		t.Errorf("expected ID 'a1', got %s", result.ID)
	}
	if result.Type != string(models.ContentTypeAlbum) {
		t.Errorf("expected type %s, got %s", models.ContentTypeAlbum, result.Type)
	}
	if result.Title != "Album 1" {
		t.Errorf("expected title 'Album 1', got %s", result.Title)
	}
	if result.ImageURL == nil || *result.ImageURL != "http://example.com/1.jpg" {
		t.Errorf("expected image URL, got %v", result.ImageURL)
	}
}

func TestMapAlbumDetail(t *testing.T) {
	album := spotify.SpotifyAlbum{
		ID:          "a1",
		Name:        "Album 1",
		AlbumType:   "album",
		ReleaseDate: "2023-01-01",
		TotalTracks: 10,
		Artists: []spotify.SpotifyArtist{
			{Name: "Artist 1"},
		},
		Images: []spotify.SpotifyImage{
			{URL: "http://example.com/1.jpg", Width: 640},
		},
		ExternalURLs: spotify.SpotifyExternalURLs{
			Spotify: "http://spotify.com/album/1",
		},
		Tracks: &spotify.SpotifyTrackPage{
			Items: []spotify.SpotifyTrack{
				{
					ID:         "t1",
					Name:       "Track 1",
					DurationMs: 180000,
					Artists:    []spotify.SpotifyArtist{{Name: "Artist 1"}},
				},
			},
		},
	}

	result := MapAlbumDetail(album)

	if result.ID != "a1" {
		t.Errorf("expected ID 'a1', got %s", result.ID)
	}
	if result.Title != "Album 1" {
		t.Errorf("expected title 'Album 1', got %s", result.Title)
	}
	if len(result.Tracks) != 1 {
		t.Errorf("expected 1 track, got %d", len(result.Tracks))
	}
	if result.DurationMinutes == nil || *result.DurationMinutes != 3 {
		t.Errorf("expected duration 3 min, got %v", result.DurationMinutes)
	}
	if result.ExternalURL == nil || *result.ExternalURL != "http://spotify.com/album/1" {
		t.Errorf("expected external URL, got %v", result.ExternalURL)
	}
}

func TestDeriveAlbumType(t *testing.T) {
	tests := []struct {
		name            string
		totalTracks     int
		durationMinutes *int
		expected        string
	}{
		{"Album by duration", 1, intPtr(35), string(models.AlbumTypeAlbum)},
		{"Album by tracks", 8, intPtr(20), string(models.AlbumTypeAlbum)},
		{"EP", 5, intPtr(15), string(models.AlbumTypeEP)},
		{"Single", 2, intPtr(8), string(models.AlbumTypeSingle)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := deriveAlbumType(tt.totalTracks, tt.durationMinutes)
			if got != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, got)
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
		{"Full date", "2023-01-01", stringPtr("2023-01-01")},
		{"Month only", "2023-01", stringPtr("2023-01-01")},
		{"Year only", "2023", stringPtr("2023-01-01")},
		{"Empty", "", nil},
		{"Invalid", "invalid", nil},
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
