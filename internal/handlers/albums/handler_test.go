package albums

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/providers/spotify"
	spotifyservice "github.com/codeyee/denn-proxy/internal/services/spotify/service"
	"github.com/gin-gonic/gin"
)

// NoOpCache implementation for testing
type NoOpCache struct{}

func (NoOpCache) Get(ctx context.Context, key string) ([]byte, error) { return nil, nil }
func (NoOpCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	return nil
}
func (NoOpCache) DeletePattern(ctx context.Context, pattern string) (int64, error) { return 0, nil }
func (NoOpCache) Incr(ctx context.Context, key string) (int64, error)              { return 0, nil }
func (NoOpCache) TTL(ctx context.Context, key string) (time.Duration, error) { return 0, nil }
func (NoOpCache) Expire(ctx context.Context, key string, ttl time.Duration) (bool, error) {
	return true, nil
}
func (NoOpCache) Close() error { return nil }

// Mock RoundTripper
type RoundTripFunc func(req *http.Request) *http.Response

func (f RoundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req), nil
}

func NewTestClient(fn RoundTripFunc) *http.Client {
	return &http.Client{
		Transport: fn,
	}
}

func setupTestHandler(client *http.Client) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	spotifyClient := spotify.NewClient("test-id", "test-secret", NoOpCache{}, clients.WithHTTPClient(client))
	service := spotifyservice.NewService(spotifyClient)
	handler := NewHandler(service)

	r.GET("/albums", handler.Search)
	r.GET("/albums/:id", handler.Detail)
	r.GET("/albums/trending", handler.Trending)
	r.GET("/albums/bulk", handler.Bulk)

	return r
}

func TestSearch(t *testing.T) {
	// Mock Spotify Auth Response
	mockAuthResponse := `{
		"access_token": "test-token",
		"token_type": "Bearer",
		"expires_in": 3600
	}`

	// Mock Spotify Search Response
	mockSearchResponse := `{
		"albums": {
			"href": "https://api.spotify.com/v1/search?query=test&type=album&offset=0&limit=20",
			"items": [
				{
					"album_type": "album",
					"artists": [
						{
							"external_urls": {
								"spotify": "https://open.spotify.com/artist/test-artist"
							},
							"href": "https://api.spotify.com/v1/artists/test-artist",
							"id": "test-artist",
							"name": "Test Artist",
							"type": "artist",
							"uri": "spotify:artist:test-artist"
						}
					],
					"external_urls": {
						"spotify": "https://open.spotify.com/album/test-album"
					},
					"href": "https://api.spotify.com/v1/albums/test-album",
					"id": "test-album",
					"images": [
						{
							"height": 640,
							"url": "https://i.scdn.co/image/test-image",
							"width": 640
						}
					],
					"name": "Test Album",
					"release_date": "2023-01-01",
					"release_date_precision": "day",
					"total_tracks": 10,
					"type": "album",
					"uri": "spotify:album:test-album"
				}
			],
			"limit": 20,
			"next": null,
			"offset": 0,
			"previous": null,
			"total": 1
		}
	}`

	client := NewTestClient(func(req *http.Request) *http.Response {
		// Handle Auth Request
		if req.URL.String() == spotify.AuthURL {
			return &http.Response{
				StatusCode: 200,
				Body:       io.NopCloser(strings.NewReader(mockAuthResponse)),
				Header:     make(http.Header),
			}
		}

		// Verify Search Request
		if strings.Contains(req.URL.String(), "/search") {
			if req.URL.Query().Get("q") != "test" {
				return &http.Response{
					StatusCode: 500,
					Body:       io.NopCloser(strings.NewReader(`{"error": {"message": "Unexpected query"}}`)),
					Header:     make(http.Header),
				}
			}
			return &http.Response{
				StatusCode: 200,
				Body:       io.NopCloser(strings.NewReader(mockSearchResponse)),
				Header:     make(http.Header),
			}
		}

		return &http.Response{
			StatusCode: 500,
			Body:       io.NopCloser(strings.NewReader(`{"error": {"message": "Unexpected URL"}}`)),
			Header:     make(http.Header),
		}
	})

	r := setupTestHandler(client)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/albums?q=test", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	results, ok := resp["results"].([]interface{})
	if !ok || len(results) != 1 {
		t.Fatalf("Expected 1 result, got %v", results)
	}

	first := results[0].(map[string]interface{})
	if first["title"] != "Test Album" {
		t.Errorf("Expected title 'Test Album', got '%v'", first["title"])
	}
}

func TestDetail(t *testing.T) {
	mockAuthResponse := `{
		"access_token": "test-token",
		"token_type": "Bearer",
		"expires_in": 3600
	}`

	mockDetailResponse := `{
		"album_type": "album",
		"artists": [
			{
				"external_urls": {
					"spotify": "https://open.spotify.com/artist/test-artist"
				},
				"href": "https://api.spotify.com/v1/artists/test-artist",
				"id": "test-artist",
				"name": "Test Artist",
				"type": "artist",
				"uri": "spotify:artist:test-artist"
			}
		],
		"external_urls": {
			"spotify": "https://open.spotify.com/album/test-album"
		},
		"href": "https://api.spotify.com/v1/albums/test-album",
		"id": "test-album",
		"images": [
			{
				"height": 640,
				"url": "https://i.scdn.co/image/test-image",
				"width": 640
			}
		],
		"name": "Test Album",
		"release_date": "2023-01-01",
		"release_date_precision": "day",
		"total_tracks": 10,
		"type": "album",
		"uri": "spotify:album:test-album",
		"tracks": {
			"href": "https://api.spotify.com/v1/albums/test-album/tracks",
			"items": [],
			"limit": 20,
			"next": null,
			"offset": 0,
			"previous": null,
			"total": 0
		}
	}`

	client := NewTestClient(func(req *http.Request) *http.Response {
		if req.URL.String() == spotify.AuthURL {
			return &http.Response{
				StatusCode: 200,
				Body:       io.NopCloser(strings.NewReader(mockAuthResponse)),
				Header:     make(http.Header),
			}
		}

		if strings.Contains(req.URL.String(), "/albums/test-album") {
			return &http.Response{
				StatusCode: 200,
				Body:       io.NopCloser(strings.NewReader(mockDetailResponse)),
				Header:     make(http.Header),
			}
		}

		return &http.Response{
			StatusCode: 404,
			Body:       io.NopCloser(strings.NewReader(`{"error": {"message": "Not found"}}`)),
			Header:     make(http.Header),
		}
	})

	r := setupTestHandler(client)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/albums/test-album", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if resp["id"] != "test-album" {
		t.Errorf("Expected id 'test-album', got '%v'", resp["id"])
	}

	if resp["title"] != "Test Album" {
		t.Errorf("Expected title 'Test Album', got '%v'", resp["title"])
	}
}

func TestTrending(t *testing.T) {
	mockAuthResponse := `{
		"access_token": "test-token",
		"token_type": "Bearer",
		"expires_in": 3600
	}`

	client := NewTestClient(func(req *http.Request) *http.Response {
		if req.URL.String() == spotify.AuthURL {
			return &http.Response{
				StatusCode: 200,
				Body:       io.NopCloser(strings.NewReader(mockAuthResponse)),
				Header:     make(http.Header),
			}
		}

		if strings.Contains(req.URL.String(), "charts-spotify-com-service.spotify.com/public/v0/charts") {
			// Return mocked charts response structure
			// Note: The service expects chartEntryViewResponses structure
			mockChartsResponse := `{
				"chartEntryViewResponses": [
					{},
					{
						"entries": [
							{
								"albumMetadata": {
									"albumUri": "spotify:album:test-album",
									"albumName": "Test Album",
									"displayImageUri": "https://i.scdn.co/image/test-image",
									"releaseDate": "2023-01-01",
									"artists": [
										{
											"name": "Test Artist",
											"spotifyUri": "spotify:artist:test-artist"
										}
									]
								}
							}
						]
					}
				]
			}`
			return &http.Response{
				StatusCode: 200,
				Body:       io.NopCloser(strings.NewReader(mockChartsResponse)),
				Header:     make(http.Header),
			}
		}

		return &http.Response{
			StatusCode: 500,
			Body:       io.NopCloser(strings.NewReader(`{"error": {"message": "Unexpected URL"}}`)),
			Header:     make(http.Header),
		}
	})

	r := setupTestHandler(client)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/albums/trending", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	results, ok := resp["results"].([]interface{})
	if !ok || len(results) != 1 {
		t.Fatalf("Expected 1 result, got %v", results)
	}
}
