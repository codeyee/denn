package tmdb

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/codeyee/denn-proxy/internal/clients"
	tmdbclient "github.com/codeyee/denn-proxy/internal/providers/tmdb"
)

type MockRoundTripper struct {
	Response *http.Response
	Err      error
}

func (m *MockRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return m.Response, m.Err
}

func TestSearchMovies(t *testing.T) {
	tests := []struct {
		name           string
		query          string
		page           int
		mockResponse   map[string]interface{}
		mockStatus     int
		expectedCount  int
		expectedTitle  string
		expectError    bool
	}{
		{
			name:  "Success",
			query: "Matrix",
			page:  1,
			mockResponse: map[string]interface{}{
				"page": 1,
				"results": []map[string]interface{}{
					{"id": 1, "title": "The Matrix", "release_date": "1999-03-30"},
				},
				"total_pages":   1,
				"total_results": 1,
			},
			mockStatus:    http.StatusOK,
			expectedCount: 1,
			expectedTitle: "The Matrix",
			expectError:   false,
		},
		{
			name:  "Empty Results",
			query: "NonExistent",
			page:  1,
			mockResponse: map[string]interface{}{
				"page":          1,
				"results":       []map[string]interface{}{},
				"total_pages":   1,
				"total_results": 0,
			},
			mockStatus:    http.StatusOK,
			expectedCount: 0,
			expectError:   false,
		},
		{
			name:          "API Error",
			query:         "Error",
			page:          1,
			mockStatus:    http.StatusInternalServerError,
			expectError:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockBody, _ := json.Marshal(tt.mockResponse)
			mockTransport := &MockRoundTripper{
				Response: &http.Response{
					StatusCode: tt.mockStatus,
					Body:       io.NopCloser(bytes.NewReader(mockBody)),
					Header:     make(http.Header),
				},
			}

			client := tmdbclient.NewClient("test-key", clients.NoOpCache{}, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))
			service := NewService(client)

			result, err := service.SearchMovies(context.Background(), tt.query, tt.page, 20)

			if tt.expectError {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if len(result.Results) != tt.expectedCount {
				t.Errorf("expected %d results, got %d", tt.expectedCount, len(result.Results))
			}

			if tt.expectedCount > 0 && result.Results[0].Title != tt.expectedTitle {
				t.Errorf("expected title %q, got %q", tt.expectedTitle, result.Results[0].Title)
			}
		})
	}
}

func TestGetPopularMovies(t *testing.T) {
	tests := []struct {
		name           string
		page           int
		mockResponse   map[string]interface{}
		mockStatus     int
		expectedCount  int
		expectedTitle  string
		expectError    bool
	}{
		{
			name: "Success",
			page: 1,
			mockResponse: map[string]interface{}{
				"page": 1,
				"results": []map[string]interface{}{
					{"id": 1, "title": "Popular Movie", "release_date": "2023-01-01"},
				},
				"total_pages":   10,
				"total_results": 100,
			},
			mockStatus:    http.StatusOK,
			expectedCount: 1,
			expectedTitle: "Popular Movie",
			expectError:   false,
		},
		{
			name:       "API Error",
			page:       1,
			mockStatus: http.StatusInternalServerError,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockBody, _ := json.Marshal(tt.mockResponse)
			mockTransport := &MockRoundTripper{
				Response: &http.Response{
					StatusCode: tt.mockStatus,
					Body:       io.NopCloser(bytes.NewReader(mockBody)),
					Header:     make(http.Header),
				},
			}

			client := tmdbclient.NewClient("test-key", clients.NoOpCache{}, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))
			service := NewService(client)

			result, err := service.GetPopularMovies(context.Background(), tt.page, 20)

			if tt.expectError {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if len(result.Results) != tt.expectedCount {
				t.Errorf("expected %d results, got %d", tt.expectedCount, len(result.Results))
			}
			
			if tt.expectedCount > 0 && result.Results[0].Title != tt.expectedTitle {
				t.Errorf("expected title %q, got %q", tt.expectedTitle, result.Results[0].Title)
			}
		})
	}
}

func TestGetMovieComplete(t *testing.T) {
	tests := []struct {
		name          string
		id            int
		mockResponse  map[string]interface{}
		mockStatus    int
		expectedTitle string
		expectError   bool
	}{
		{
			name: "Success",
			id:   1,
			mockResponse: map[string]interface{}{
				"id":             1,
				"title":          "Movie Detail",
				"original_title": "Original Title",
				"overview":       "Overview",
				"status":         "Released",
			},
			mockStatus:    http.StatusOK,
			expectedTitle: "Movie Detail",
			expectError:   false,
		},
		{
			name:       "Not Found",
			id:         999,
			mockStatus: http.StatusNotFound,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockBody, _ := json.Marshal(tt.mockResponse)
			mockTransport := &MockRoundTripper{
				Response: &http.Response{
					StatusCode: tt.mockStatus,
					Body:       io.NopCloser(bytes.NewReader(mockBody)),
					Header:     make(http.Header),
				},
			}

			client := tmdbclient.NewClient("test-key", clients.NoOpCache{}, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))
			service := NewService(client)

			result, err := service.GetMovieComplete(context.Background(), tt.id, "US")

			if tt.expectError {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if result.Title != tt.expectedTitle {
				t.Errorf("expected title %q, got %q", tt.expectedTitle, result.Title)
			}
		})
	}
}
