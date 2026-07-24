package tmdb

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/codeyee/denn-proxy/internal/clients"
)

func TestGetPopularTVShows(t *testing.T) {
	tests := []struct {
		name         string
		page         int
		mockResponse map[string]interface{}
		mockStatus   int
		wantErr      bool
		expectedPage float64
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
			name:         "API Error",
			page:         1,
			mockResponse: nil,
			mockStatus:   http.StatusInternalServerError,
			wantErr:      true,
			expectedPage: 0,
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
			opts := []clients.ClientOption{clients.WithHTTPClient(&http.Client{Transport: mockTransport})}
			if tt.wantErr {
				opts = append(opts, clients.WithNoRetry())
			}
			client := NewClient("test-key", cache, opts...)

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

func TestSearchTVShowsScopesCacheByAdultPolicy(t *testing.T) {
	var includeAdultValues []string
	transport := roundTripFunc(func(req *http.Request) (*http.Response, error) {
		includeAdultValues = append(includeAdultValues, req.URL.Query().Get("include_adult"))
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewBufferString(`{"page":1,"results":[]}`)),
			Header:     make(http.Header),
		}, nil
	})
	cache := NewMockCache()
	client := NewClient(
		"test-key",
		cache,
		clients.WithHTTPClient(&http.Client{Transport: transport}),
	)

	if _, err := client.SearchTVShowsWithAdult(context.Background(), "Dune", 1, false); err != nil {
		t.Fatalf("default search failed: %v", err)
	}
	if _, err := client.SearchTVShowsWithAdult(context.Background(), "Dune", 1, true); err != nil {
		t.Fatalf("opt-in search failed: %v", err)
	}

	if len(includeAdultValues) != 2 ||
		includeAdultValues[0] != "false" ||
		includeAdultValues[1] != "true" {
		t.Fatalf("unexpected include_adult values: %v", includeAdultValues)
	}
	if len(cache.data) != 2 {
		t.Fatalf("expected separate cache entries for both policies, got %d", len(cache.data))
	}
}
