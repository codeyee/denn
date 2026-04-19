package service

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/codeyee/denn-proxy/internal/clients"
	spotifyclient "github.com/codeyee/denn-proxy/internal/providers/spotify"
	"github.com/codeyee/denn-proxy/internal/testutil"
)

const (
	spotifyAuthHost   = "accounts.spotify.com"
	spotifyAPIHost    = "api.spotify.com"
	spotifyChartsHost = "charts-spotify-com-service.spotify.com"
)

// spotifyTokenHandler returns a static OAuth token. Mounted on the auth host
// so the provider's client-credentials flow succeeds without any real network.
func spotifyTokenHandler() testutil.RoundTripFunc {
	return testutil.StaticJSON(http.StatusOK, map[string]any{
		"access_token": "test-token",
		"expires_in":   3600,
		"token_type":   "Bearer",
	})
}

// newAPITestService wires a service whose Spotify Web API host responds with
// the given body and status. Auth and Charts hosts get their own deterministic
// fixtures so a misrouted request fails fast instead of reusing the wrong body.
func newAPITestService(t *testing.T, body []byte, status int, extraOpts ...clients.ClientOption) *Service {
	t.Helper()
	rt := testutil.MultiHost(
		testutil.HostHandler{Host: spotifyAuthHost, Fn: spotifyTokenHandler()},
		testutil.HostHandler{Host: spotifyAPIHost, Fn: testutil.StaticJSON(status, json.RawMessage(body))},
		testutil.HostHandler{Host: spotifyChartsHost, Fn: testutil.StaticJSON(http.StatusOK, map[string]any{"chartEntryViewResponses": []any{}})},
	)
	opts := append([]clients.ClientOption{clients.WithHTTPClient(testutil.HTTPClient(rt))}, extraOpts...)
	client := spotifyclient.NewClient("test-id", "test-secret", clients.NoOpCache{}, opts...)
	return NewService(client)
}

// newChartsTestService is like newAPITestService but routes the body to the
// Charts host. The API host gets an empty payload so a leak between the two is
// loud, not silent.
func newChartsTestService(t *testing.T, body []byte, status int) *Service {
	t.Helper()
	rt := testutil.MultiHost(
		testutil.HostHandler{Host: spotifyAuthHost, Fn: spotifyTokenHandler()},
		testutil.HostHandler{Host: spotifyAPIHost, Fn: testutil.StaticJSON(http.StatusOK, map[string]any{})},
		testutil.HostHandler{Host: spotifyChartsHost, Fn: testutil.StaticJSON(status, json.RawMessage(body))},
	)
	client := spotifyclient.NewClient("test-id", "test-secret", clients.NoOpCache{},
		clients.WithHTTPClient(testutil.HTTPClient(rt)))
	return NewService(client)
}

func TestSearchAlbums_Success(t *testing.T) {
	mockResponse := map[string]any{
		"albums": map[string]any{
			"items": []map[string]any{
				{
					"id":            "1",
					"name":          "OK Computer",
					"album_type":    "album",
					"total_tracks":  12,
					"release_date":  "1997-05-21",
					"images":        []map[string]any{{"url": "https://img.jpg", "height": 640, "width": 640}},
					"artists":       []map[string]any{{"name": "Radiohead"}},
					"external_urls": map[string]any{"spotify": "https://open.spotify.com/album/1"},
				},
			},
			"total":  100,
			"limit":  20,
			"offset": 0,
		},
	}
	mockBody, _ := json.Marshal(mockResponse)
	service := newAPITestService(t, mockBody, http.StatusOK)

	result, err := service.SearchAlbums(context.Background(), "Radiohead", 1, 20)
	if err != nil {
		t.Fatalf("SearchAlbums failed: %v", err)
	}
	if len(result.Results) != 1 {
		t.Errorf("expected 1 result, got %d", len(result.Results))
	}
	if result.Results[0].Title != "OK Computer" {
		t.Errorf("expected title 'OK Computer', got %s", result.Results[0].Title)
	}
	if result.TotalResults != 100 {
		t.Errorf("expected TotalResults 100, got %d", result.TotalResults)
	}
	if result.Page != 1 {
		t.Errorf("expected Page 1, got %d", result.Page)
	}
}

func TestSearchAlbums_FiltersSingles(t *testing.T) {
	mockResponse := map[string]any{
		"albums": map[string]any{
			"items": []map[string]any{
				{
					"id": "1", "name": "Album One", "album_type": "album", "total_tracks": 10,
					"release_date": "2023-01-01", "images": []any{}, "artists": []any{},
					"external_urls": map[string]any{"spotify": ""},
				},
				{
					"id": "2", "name": "Single Track", "album_type": "single", "total_tracks": 1,
					"release_date": "2023-02-01", "images": []any{}, "artists": []any{},
					"external_urls": map[string]any{"spotify": ""},
				},
				{
					"id": "3", "name": "EP Release", "album_type": "ep", "total_tracks": 5,
					"release_date": "2023-03-01", "images": []any{}, "artists": []any{},
					"external_urls": map[string]any{"spotify": ""},
				},
			},
			"total": 3, "limit": 20, "offset": 0,
		},
	}
	mockBody, _ := json.Marshal(mockResponse)
	service := newAPITestService(t, mockBody, http.StatusOK)

	result, err := service.SearchAlbums(context.Background(), "test", 1, 20)
	if err != nil {
		t.Fatalf("SearchAlbums failed: %v", err)
	}
	if len(result.Results) != 2 {
		t.Errorf("expected 2 results (single filtered), got %d", len(result.Results))
	}
	for _, r := range result.Results {
		if r.Title == "Single Track" {
			t.Error("single should have been filtered out")
		}
	}
}

func TestSearchAlbums_EmptyResults(t *testing.T) {
	mockResponse := map[string]any{
		"albums": map[string]any{
			"items":  []any{},
			"total":  0,
			"limit":  20,
			"offset": 0,
		},
	}
	mockBody, _ := json.Marshal(mockResponse)
	service := newAPITestService(t, mockBody, http.StatusOK)

	result, err := service.SearchAlbums(context.Background(), "nonexistent", 1, 20)
	if err != nil {
		t.Fatalf("SearchAlbums failed: %v", err)
	}
	if len(result.Results) != 0 {
		t.Errorf("expected 0 results, got %d", len(result.Results))
	}
}

func TestSearchAlbums_APIError(t *testing.T) {
	// WithNoRetry: 500 is part of the fixture, not a transient failure to
	// recover from. Without it the BaseClient retry loop would multiply this
	// test's runtime by ~30s for no extra coverage.
	service := newAPITestService(t, []byte(`{}`), http.StatusInternalServerError, clients.WithNoRetry())

	_, err := service.SearchAlbums(context.Background(), "test", 1, 20)
	if err == nil {
		t.Error("expected error for API error status")
	}
}

func TestGetAlbumComplete_Success(t *testing.T) {
	mockResponse := map[string]any{
		"id": "album1", "name": "The Bends", "album_type": "album", "total_tracks": 12,
		"release_date": "1995-03-13",
		"images": []map[string]any{
			{"url": "https://large.jpg", "height": 640, "width": 640},
			{"url": "https://medium.jpg", "height": 300, "width": 300},
		},
		"artists":       []map[string]any{{"name": "Radiohead"}},
		"external_urls": map[string]any{"spotify": "https://open.spotify.com/album/album1"},
		"tracks": map[string]any{
			"items": []map[string]any{
				{"id": "t1", "name": "Planet Telex", "track_number": 1, "duration_ms": 263000, "artists": []any{}, "external_urls": map[string]any{"spotify": ""}},
				{"id": "t2", "name": "The Bends", "track_number": 2, "duration_ms": 246000, "artists": []any{}, "external_urls": map[string]any{"spotify": ""}},
			},
		},
	}
	mockBody, _ := json.Marshal(mockResponse)
	service := newAPITestService(t, mockBody, http.StatusOK)

	album, err := service.GetAlbumComplete(context.Background(), "album1")
	if err != nil {
		t.Fatalf("GetAlbumComplete failed: %v", err)
	}
	if album.ID != "album1" {
		t.Errorf("expected ID 'album1', got %s", album.ID)
	}
	if album.Title != "The Bends" {
		t.Errorf("expected title 'The Bends', got %s", album.Title)
	}
	if len(album.Tracks) != 2 {
		t.Errorf("expected 2 tracks, got %d", len(album.Tracks))
	}
	if len(album.Authors) != 1 || album.Authors[0].Name != "Radiohead" {
		t.Errorf("expected author 'Radiohead', got %v", album.Authors)
	}
}

func TestGetAlbumComplete_NotFound(t *testing.T) {
	service := newAPITestService(t, []byte(`{}`), http.StatusNotFound)

	_, err := service.GetAlbumComplete(context.Background(), "nonexistent")
	if err == nil {
		t.Error("expected error for not found")
	}
}

func TestGetTrendingAlbums_Success(t *testing.T) {
	chartsResponse := map[string]any{
		"chartEntryViewResponses": []map[string]any{
			{"entries": []any{}},
			{
				"entries": []map[string]any{
					{
						"albumMetadata": map[string]any{
							"albumUri":        "spotify:album:abc123",
							"albumName":       "Trending Album",
							"displayImageUri": "https://img.jpg",
							"releaseDate":     "2026-01-15",
							"artists":         []map[string]any{{"name": "Trending Artist", "spotifyUri": "spotify:artist:xyz"}},
						},
					},
					{
						"albumMetadata": map[string]any{
							"albumUri":        "spotify:album:def456",
							"albumName":       "Another Album",
							"displayImageUri": "https://img2.jpg",
							"releaseDate":     "2026-02-01",
							"artists":         []map[string]any{{"name": "Another Artist"}},
						},
					},
				},
			},
		},
	}
	mockBody, _ := json.Marshal(chartsResponse)
	service := newChartsTestService(t, mockBody, http.StatusOK)

	result, err := service.GetTrendingAlbums(context.Background(), 1, 20)
	if err != nil {
		t.Fatalf("GetTrendingAlbums failed: %v", err)
	}
	if len(result.Results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(result.Results))
	}
	if result.Results[0].Title != "Trending Album" {
		t.Errorf("expected title 'Trending Album', got %s", result.Results[0].Title)
	}
	if result.Results[0].ID != "abc123" {
		t.Errorf("expected ID 'abc123', got %s", result.Results[0].ID)
	}
	if result.TotalResults != 2 {
		t.Errorf("expected TotalResults 2, got %d", result.TotalResults)
	}
}

func TestGetTrendingAlbums_EmptyChart(t *testing.T) {
	chartsResponse := map[string]any{
		"chartEntryViewResponses": []map[string]any{
			{"entries": []any{}},
			{"entries": []any{}},
		},
	}
	mockBody, _ := json.Marshal(chartsResponse)
	service := newChartsTestService(t, mockBody, http.StatusOK)

	result, err := service.GetTrendingAlbums(context.Background(), 1, 20)
	if err != nil {
		t.Fatalf("GetTrendingAlbums failed: %v", err)
	}
	if len(result.Results) != 0 {
		t.Errorf("expected 0 results, got %d", len(result.Results))
	}
}
