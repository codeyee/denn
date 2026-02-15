package movies

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
	"github.com/codeyee/denn-proxy/internal/providers/tmdb"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb/service"
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

	tmdbClient := tmdb.NewClient("test-api-key", NoOpCache{}, clients.WithHTTPClient(client))
	service := tmdbservice.NewService(tmdbClient)
	handler := NewHandler(service)

	r.GET("/movies/search", handler.Search)
	r.GET("/movies/:id", handler.Detail)
	r.GET("/movies/trending", handler.Trending)
	r.GET("/movies/bulk", handler.Bulk)

	return r
}

func TestSearch(t *testing.T) {
	// Mock TMDB Response
	mockResponse := `{
		"page": 1,
		"total_pages": 1,
		"total_results": 1,
		"results": [
			{
				"id": 123,
				"title": "Test Movie",
				"original_title": "Test Movie Original",
				"overview": "A test movie overview",
				"release_date": "2023-01-01",
				"media_type": "movie"
			}
		]
	}`

	client := NewTestClient(func(req *http.Request) *http.Response {
		// Verify request
		if !strings.Contains(req.URL.String(), "/search/movie") {
			return &http.Response{
				StatusCode: 500,
				Body:       io.NopCloser(strings.NewReader(`{"status_message": "Unexpected URL"}`)),
				Header:     make(http.Header),
			}
		}

		if req.URL.Query().Get("query") != "test" {
			return &http.Response{
				StatusCode: 500,
				Body:       io.NopCloser(strings.NewReader(`{"status_message": "Unexpected query"}`)),
				Header:     make(http.Header),
			}
		}

		return &http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(strings.NewReader(mockResponse)),
			Header:     make(http.Header),
		}
	})

	r := setupTestHandler(client)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/movies/search?query=test", nil)
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

	first := results[0].(map[string]interface{})
	if first["title"] != "Test Movie" {
		t.Errorf("Expected title 'Test Movie', got '%v'", first["title"])
	}
}

func TestDetail(t *testing.T) {
	// Mock TMDB Response
	mockResponse := `{
		"id": 123,
		"title": "Test Movie",
		"original_title": "Test Movie Original",
		"overview": "A test movie overview",
		"release_date": "2023-01-01",
		"status": "Released",
		"runtime": 120
	}`

	client := NewTestClient(func(req *http.Request) *http.Response {
		// Verify request
		if !strings.Contains(req.URL.String(), "/movie/123") {
			return &http.Response{
				StatusCode: 500,
				Body:       io.NopCloser(strings.NewReader(`{"status_message": "Unexpected URL"}`)),
				Header:     make(http.Header),
			}
		}

		return &http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(strings.NewReader(mockResponse)),
			Header:     make(http.Header),
		}
	})

	r := setupTestHandler(client)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/movies/123", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if resp["id"] != "123" { // IDs are converted to string in response
		t.Errorf("Expected id '123', got '%v'", resp["id"])
	}

	if resp["title"] != "Test Movie" {
		t.Errorf("Expected title 'Test Movie', got '%v'", resp["title"])
	}
}

func TestNotFound(t *testing.T) {
	client := NewTestClient(func(req *http.Request) *http.Response {
		return &http.Response{
			StatusCode: 404,
			Body:       io.NopCloser(strings.NewReader(`{"status_message": "The resource you requested could not be found."}`)),
			Header:     make(http.Header),
		}
	})

	r := setupTestHandler(client)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/movies/999", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", w.Code)
	}
}
