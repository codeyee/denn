package tmdb

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
)

type MockRoundTripper struct {
	Response *http.Response
	Err      error
}

func (m *MockRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return m.Response, m.Err
}

type MockCache struct {
	data map[string][]byte
}

func NewMockCache() *MockCache {
	return &MockCache{
		data: make(map[string][]byte),
	}
}

func (m *MockCache) Get(ctx context.Context, key string) ([]byte, error) {
	if val, ok := m.data[key]; ok {
		return val, nil
	}
	return nil, nil
}

func (m *MockCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	m.data[key] = value
	return nil
}

func (m *MockCache) DeletePattern(ctx context.Context, pattern string) (int64, error) {
	return 0, nil
}

func (m *MockCache) Close() error {
	return nil
}

func TestGetPopularMovies(t *testing.T) {
	tests := []struct {
		name          string
		page          int
		mockResponse  map[string]interface{}
		mockStatus    int
		wantErr       bool
		expectedPage  float64
	}{
		{
			name: "Success - Page 1",
			page: 1,
			mockResponse: map[string]interface{}{
				"page": 1,
				"results": []map[string]interface{}{
					{"id": 1, "title": "Inception"},
				},
				"total_pages":   10,
				"total_results": 100,
			},
			mockStatus:   http.StatusOK,
			wantErr:      false,
			expectedPage: 1,
		},
		{
			name: "Success - Page 2",
			page: 2,
			mockResponse: map[string]interface{}{
				"page": 2,
				"results": []map[string]interface{}{
					{"id": 2, "title": "Interstellar"},
				},
				"total_pages":   10,
				"total_results": 100,
			},
			mockStatus:   http.StatusOK,
			wantErr:      false,
			expectedPage: 2,
		},
		{
			name:          "API Error",
			page:          1,
			mockResponse:  nil,
			mockStatus:    http.StatusInternalServerError,
			wantErr:       false, // Client returns response with error status, not error struct
			expectedPage:  0,
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

			cache := NewMockCache()
			// Use the refactored NewClient with options
			client := NewClient("test-key", cache, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))

			resp, err := client.GetPopularMovies(context.Background(), tt.page)

			if tt.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			
			if resp.StatusCode != tt.mockStatus {
				t.Errorf("expected status %d, got %d", tt.mockStatus, resp.StatusCode)
			}

			if tt.mockStatus == http.StatusOK {
				var result map[string]interface{}
				if err := json.Unmarshal(resp.Data, &result); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}

				if result["page"].(float64) != tt.expectedPage {
					t.Errorf("Expected page %v, got %v", tt.expectedPage, result["page"])
				}
			}
		})
	}
}

func TestGetPopularTVShows(t *testing.T) {
	tests := []struct {
		name          string
		page          int
		mockResponse  map[string]interface{}
		mockStatus    int
		wantErr       bool
		expectedPage  float64
	}{
		{
			name: "Success - Page 1",
			page: 1,
			mockResponse: map[string]interface{}{
				"page": 1,
				"results": []map[string]interface{}{
					{"id": 1, "name": "Breaking Bad"},
				},
				"total_pages":   10,
				"total_results": 100,
			},
			mockStatus:   http.StatusOK,
			wantErr:      false,
			expectedPage: 1,
		},
		{
			name:          "API Error",
			page:          1,
			mockResponse:  nil,
			mockStatus:    http.StatusInternalServerError,
			wantErr:       false,
			expectedPage:  0,
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

			cache := NewMockCache()
			client := NewClient("test-key", cache, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))

			resp, err := client.GetPopularTVShows(context.Background(), tt.page)
			
			if tt.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if resp.StatusCode != tt.mockStatus {
				t.Errorf("expected status %d, got %d", tt.mockStatus, resp.StatusCode)
			}

			if tt.mockStatus == http.StatusOK {
				var result map[string]interface{}
				if err := json.Unmarshal(resp.Data, &result); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}

				if result["page"].(float64) != tt.expectedPage {
					t.Errorf("Expected page %v, got %v", tt.expectedPage, result["page"])
				}
			}
		})
	}
}

func TestSearchMovies(t *testing.T) {
	tests := []struct {
		name         string
		query        string
		page         int
		mockResponse map[string]interface{}
		mockStatus   int
	}{
		{
			name:  "Success",
			query: "Matrix",
			page:  1,
			mockResponse: map[string]interface{}{
				"page":    1,
				"results": []map[string]interface{}{{"id": 1, "title": "The Matrix"}},
			},
			mockStatus: http.StatusOK,
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
			cache := NewMockCache()
			client := NewClient("test-key", cache, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))

			resp, err := client.SearchMovies(context.Background(), tt.query, tt.page)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if resp.StatusCode != tt.mockStatus {
				t.Errorf("expected status %d, got %d", tt.mockStatus, resp.StatusCode)
			}
		})
	}
}
