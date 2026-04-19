package books

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/providers/openlibrary"
	booksservice "github.com/codeyee/denn-proxy/internal/services/books/service"
	"github.com/gin-gonic/gin"
)

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

	olClient := openlibrary.NewClient(clients.NoOpCache{}, clients.WithHTTPClient(client))
	service := booksservice.NewService(olClient)
	handler := NewHandler(service)

	r.GET("/books", handler.Search)
	r.GET("/books/:id", handler.Detail)
	r.GET("/books/trending", handler.Trending)
	r.GET("/books/bulk", handler.Bulk)

	return r
}

func TestSearch(t *testing.T) {
	mockSearchResponse := `{
		"numFound": 1,
		"docs": [
			{
				"key": "/works/OL123W",
				"title": "Test Book",
				"author_name": ["Test Author"],
				"first_publish_year": 2023,
				"cover_i": 12345
			}
		]
	}`

	client := NewTestClient(func(req *http.Request) *http.Response {
		if strings.Contains(req.URL.String(), "/search.json") {
			if req.URL.Query().Get("q") != "test" {
				return &http.Response{
					StatusCode: 500,
					Body:       io.NopCloser(strings.NewReader(`{"error": "Unexpected query"}`)),
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
			Body:       io.NopCloser(strings.NewReader(`{"error": "Unexpected URL"}`)),
			Header:     make(http.Header),
		}
	})

	r := setupTestHandler(client)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/books?q=test", nil)
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
	if first["title"] != "Test Book" {
		t.Errorf("Expected title 'Test Book', got '%v'", first["title"])
	}
}

func TestDetail(t *testing.T) {
	mockDetailResponse := `{
		"numFound": 1,
		"docs": [
			{
				"key": "/works/OL123W",
				"title": "Test Book",
				"author_name": ["Test Author"],
				"first_publish_year": 2023,
				"cover_i": 12345,
				"description": "Test Description"
			}
		]
	}`

	client := NewTestClient(func(req *http.Request) *http.Response {
		if strings.Contains(req.URL.String(), "/search.json") {
			q := req.URL.Query().Get("q")
			if q == "OL123W" {
				return &http.Response{
					StatusCode: 200,
					Body:       io.NopCloser(strings.NewReader(mockDetailResponse)),
					Header:     make(http.Header),
				}
			}
		}

		return &http.Response{
			StatusCode: 404,
			Body:       io.NopCloser(strings.NewReader(`{"error": "Not found"}`)),
			Header:     make(http.Header),
		}
	})

	r := setupTestHandler(client)

	w := httptest.NewRecorder()
	// The handler expects the ID to be URL encoded if it contains slashes, but here we pass "OL123W" which corresponds to "works/OL123W" logic in client/service
	// Providing the key as expected by the handler.
	// Note: The service uses /search.json?q=key:/works/<id> for detail.
	// Handler takes :id.
	req, _ := http.NewRequest("GET", "/books/OL123W", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if resp["title"] != "Test Book" {
		t.Errorf("Expected title 'Test Book', got '%v'", resp["title"])
	}
}

func TestTrending(t *testing.T) {
	mockTrendingResponse := `{
		"numFound": 1,
		"docs": [
			{
				"key": "/works/OL123W",
				"title": "Test Book",
				"author_name": ["Test Author"],
				"first_publish_year": 2023
			}
		]
	}`

	client := NewTestClient(func(req *http.Request) *http.Response {
		if strings.Contains(req.URL.String(), "/search.json") {
			q := req.URL.Query().Get("q")
			sort := req.URL.Query().Get("sort")
			if q == "bestseller" && sort == "rating" {
				return &http.Response{
					StatusCode: 200,
					Body:       io.NopCloser(strings.NewReader(mockTrendingResponse)),
					Header:     make(http.Header),
				}
			}
		}

		return &http.Response{
			StatusCode: 500,
			Body:       io.NopCloser(strings.NewReader(`{"error": "Unexpected URL"}`)),
			Header:     make(http.Header),
		}
	})

	r := setupTestHandler(client)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/books/trending", nil)
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
