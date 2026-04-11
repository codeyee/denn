package service

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/codeyee/denn-proxy/internal/clients"
	spotifyclient "github.com/codeyee/denn-proxy/internal/providers/spotify"
)

type requestHandler func(*http.Request) (*http.Response, error)

type MockRoundTripper struct {
	handlers []requestHandler
}

func (m *MockRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	for _, handler := range m.handlers {
		resp, err := handler(req)
		if resp != nil || err != nil {
			return resp, err
		}
	}

	return nil, io.EOF
}

func jsonResponse(statusCode int, body []byte) *http.Response {
	return &http.Response{
		StatusCode: statusCode,
		Body:       io.NopCloser(bytes.NewReader(body)),
		Header:     make(http.Header),
	}
}

func authHandler() requestHandler {
	return func(req *http.Request) (*http.Response, error) {
		if req.URL.Host != "accounts.spotify.com" {
			return nil, nil
		}

		return jsonResponse(http.StatusOK, []byte(`{"access_token":"test-token","expires_in":3600,"token_type":"Bearer"}`)), nil
	}
}

func apiHandler(body []byte, statusCode int) requestHandler {
	return func(req *http.Request) (*http.Response, error) {
		if req.URL.Host != "api.spotify.com" {
			return nil, nil
		}

		return jsonResponse(statusCode, body), nil
	}
}

func chartsHandler(body []byte, statusCode int) requestHandler {
	return func(req *http.Request) (*http.Response, error) {
		if req.URL.Host != "charts-spotify-com-service.spotify.com" {
			return nil, nil
		}

		return jsonResponse(statusCode, body), nil
	}
}

func newTestService(mockBody []byte, statusCode int) *Service {
	mockTransport := &MockRoundTripper{
		handlers: []requestHandler{
			authHandler(),
			apiHandler(mockBody, statusCode),
			chartsHandler(mockBody, statusCode),
		},
	}

	mockHTTPClient := &http.Client{Transport: mockTransport}
	client := spotifyclient.NewClient("test-id", "test-secret", clients.NoOpCache{}, clients.WithHTTPClient(mockHTTPClient))
	return NewService(client)
}

func TestSearchAlbums_Success(t *testing.T) {
	mockResponse := map[string]interface{}{
		"albums": map[string]interface{}{
			"items": []map[string]interface{}{
				{
					"id":            "1",
					"name":          "OK Computer",
					"album_type":    "album",
					"total_tracks":  12,
					"release_date":  "1997-05-21",
					"images":        []map[string]interface{}{{"url": "https://img.jpg", "height": 640, "width": 640}},
					"artists":       []map[string]interface{}{{"name": "Radiohead"}},
					"external_urls": map[string]interface{}{"spotify": "https://open.spotify.com/album/1"},
				},
			},
			"total":  100,
			"limit":  20,
			"offset": 0,
		},
	}

	mockBody, _ := json.Marshal(mockResponse)
	service := newTestService(mockBody, http.StatusOK)

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
	mockResponse := map[string]interface{}{
		"albums": map[string]interface{}{
			"items": []map[string]interface{}{
				{
					"id":            "1",
					"name":          "Album One",
					"album_type":    "album",
					"total_tracks":  10,
					"release_date":  "2023-01-01",
					"images":        []interface{}{},
					"artists":       []interface{}{},
					"external_urls": map[string]interface{}{"spotify": ""},
				},
				{
					"id":            "2",
					"name":          "Single Track",
					"album_type":    "single",
					"total_tracks":  1,
					"release_date":  "2023-02-01",
					"images":        []interface{}{},
					"artists":       []interface{}{},
					"external_urls": map[string]interface{}{"spotify": ""},
				},
				{
					"id":            "3",
					"name":          "EP Release",
					"album_type":    "ep",
					"total_tracks":  5,
					"release_date":  "2023-03-01",
					"images":        []interface{}{},
					"artists":       []interface{}{},
					"external_urls": map[string]interface{}{"spotify": ""},
				},
			},
			"total":  3,
			"limit":  20,
			"offset": 0,
		},
	}

	mockBody, _ := json.Marshal(mockResponse)
	service := newTestService(mockBody, http.StatusOK)

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
	mockResponse := map[string]interface{}{
		"albums": map[string]interface{}{
			"items":  []interface{}{},
			"total":  0,
			"limit":  20,
			"offset": 0,
		},
	}

	mockBody, _ := json.Marshal(mockResponse)
	service := newTestService(mockBody, http.StatusOK)

	result, err := service.SearchAlbums(context.Background(), "nonexistent", 1, 20)

	if err != nil {
		t.Fatalf("SearchAlbums failed: %v", err)
	}

	if len(result.Results) != 0 {
		t.Errorf("expected 0 results, got %d", len(result.Results))
	}
}

func TestSearchAlbums_APIError(t *testing.T) {
	service := newTestService([]byte(`{}`), http.StatusInternalServerError)

	_, err := service.SearchAlbums(context.Background(), "test", 1, 20)

	if err == nil {
		t.Error("expected error for API error status")
	}
}

func TestGetAlbumComplete_Success(t *testing.T) {
	mockResponse := map[string]interface{}{
		"id":           "album1",
		"name":         "The Bends",
		"album_type":   "album",
		"total_tracks": 12,
		"release_date": "1995-03-13",
		"images": []map[string]interface{}{
			{"url": "https://large.jpg", "height": 640, "width": 640},
			{"url": "https://medium.jpg", "height": 300, "width": 300},
		},
		"artists":       []map[string]interface{}{{"name": "Radiohead"}},
		"external_urls": map[string]interface{}{"spotify": "https://open.spotify.com/album/album1"},
		"tracks": map[string]interface{}{
			"items": []map[string]interface{}{
				{"id": "t1", "name": "Planet Telex", "track_number": 1, "duration_ms": 263000, "artists": []interface{}{}, "external_urls": map[string]interface{}{"spotify": ""}},
				{"id": "t2", "name": "The Bends", "track_number": 2, "duration_ms": 246000, "artists": []interface{}{}, "external_urls": map[string]interface{}{"spotify": ""}},
			},
		},
	}

	mockBody, _ := json.Marshal(mockResponse)
	service := newTestService(mockBody, http.StatusOK)

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
	service := newTestService([]byte(`{}`), http.StatusNotFound)

	_, err := service.GetAlbumComplete(context.Background(), "nonexistent")

	if err == nil {
		t.Error("expected error for not found")
	}
}

func TestGetTrendingAlbums_Success(t *testing.T) {
	// Mock the Spotify Charts API response format
	chartsResponse := map[string]interface{}{
		"chartEntryViewResponses": []map[string]interface{}{
			{"entries": []interface{}{}}, // Index 0: tracks chart
			{ // Index 1: albums chart
				"entries": []map[string]interface{}{
					{
						"albumMetadata": map[string]interface{}{
							"albumUri":        "spotify:album:abc123",
							"albumName":       "Trending Album",
							"displayImageUri": "https://img.jpg",
							"releaseDate":     "2026-01-15",
							"artists":         []map[string]interface{}{{"name": "Trending Artist", "spotifyUri": "spotify:artist:xyz"}},
						},
					},
					{
						"albumMetadata": map[string]interface{}{
							"albumUri":        "spotify:album:def456",
							"albumName":       "Another Album",
							"displayImageUri": "https://img2.jpg",
							"releaseDate":     "2026-02-01",
							"artists":         []map[string]interface{}{{"name": "Another Artist"}},
						},
					},
				},
			},
		},
	}

	mockBody, _ := json.Marshal(chartsResponse)
	service := newTestService(mockBody, http.StatusOK)

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
	chartsResponse := map[string]interface{}{
		"chartEntryViewResponses": []map[string]interface{}{
			{"entries": []interface{}{}},
			{"entries": []interface{}{}},
		},
	}

	mockBody, _ := json.Marshal(chartsResponse)
	service := newTestService(mockBody, http.StatusOK)

	result, err := service.GetTrendingAlbums(context.Background(), 1, 20)

	if err != nil {
		t.Fatalf("GetTrendingAlbums failed: %v", err)
	}

	if len(result.Results) != 0 {
		t.Errorf("expected 0 results, got %d", len(result.Results))
	}
}
