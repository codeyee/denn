package service

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
	tmdbclient "github.com/codeyee/denn-proxy/internal/providers/tmdb"
	"github.com/codeyee/denn-proxy/internal/services/tmdb"
)

type mockRoundTripper struct {
	roundTripFunc func(*http.Request) (*http.Response, error)
}

func (m *mockRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return m.roundTripFunc(req)
}

func newTestService(handler func(*http.Request) (*http.Response, error)) *Service {
	httpClient := &http.Client{
		Transport: &mockRoundTripper{roundTripFunc: handler},
		Timeout:   10 * time.Second,
	}

	tmdbClient := tmdbclient.NewClient("test-api-key", clients.NoOpCache{}, clients.WithHTTPClient(httpClient))
	return NewService(tmdbClient)
}

func makeJSONResponse(statusCode int, body interface{}) (*http.Response, error) {
	var bodyBytes []byte
	var err error

	if body != nil {
		bodyBytes, err = json.Marshal(body)
		if err != nil {
			return nil, err
		}
	}

	return &http.Response{
		StatusCode: statusCode,
		Body:       io.NopCloser(bytes.NewBuffer(bodyBytes)),
		Header:     make(http.Header),
	}, nil
}

func stringPtr(s string) *string {
	return &s
}

func TestSearchMovies(t *testing.T) {
	mockResponse := tmdb.TmdbSearchResponse{
		Page:         1,
		TotalPages:   1,
		TotalResults: 1,
		Results: []tmdb.TmdbSearchResult{
			{
				ID:          1,
				Title:       "Test Movie",
				Overview:    "Test Overview",
				PosterPath:  stringPtr("/poster.jpg"),
				ReleaseDate: "2023-01-01",
			},
		},
	}

	service := newTestService(func(req *http.Request) (*http.Response, error) {
		if req.URL.Path != "/3/search/movie" {
			t.Errorf("expected path /3/search/movie, got %s", req.URL.Path)
		}
		if req.URL.Query().Get("query") != "test" {
			t.Errorf("expected query 'test', got %s", req.URL.Query().Get("query"))
		}
		return makeJSONResponse(200, mockResponse)
	})

	result, err := service.SearchMovies(context.Background(), "test", 1, 20)
	if err != nil {
		t.Fatalf("SearchMovies failed: %v", err)
	}

	if len(result.Results) != 1 {
		t.Errorf("expected 1 result, got %d", len(result.Results))
	}
	if result.Results[0].Title != "Test Movie" {
		t.Errorf("expected title 'Test Movie', got %s", result.Results[0].Title)
	}
}

func TestGetMovieComplete(t *testing.T) {
	mockResponse := tmdb.TmdbMovieDetail{
		ID:          1,
		Title:       "Test Movie",
		Overview:    "Test Overview",
		PosterPath:  stringPtr("/poster.jpg"),
		ReleaseDate: "2023-01-01",
	}

	service := newTestService(func(req *http.Request) (*http.Response, error) {
		if req.URL.Path != "/3/movie/1" {
			t.Errorf("expected path /3/movie/1, got %s", req.URL.Path)
		}
		return makeJSONResponse(200, mockResponse)
	})

	result, err := service.GetMovieComplete(context.Background(), 1, "US")
	if err != nil {
		t.Fatalf("GetMovieComplete failed: %v", err)
	}

	if result.Title != "Test Movie" {
		t.Errorf("expected title 'Test Movie', got %s", result.Title)
	}
}

func TestGetPopularMovies(t *testing.T) {
	mockResponse := tmdb.TmdbSearchResponse{
		Page:         1,
		TotalPages:   1,
		TotalResults: 1,
		Results: []tmdb.TmdbSearchResult{
			{
				ID:          1,
				Title:       "Popular Movie",
				Overview:    "Overview",
				PosterPath:  stringPtr("/poster.jpg"),
				ReleaseDate: "2023-01-01",
			},
		},
	}

	service := newTestService(func(req *http.Request) (*http.Response, error) {
		if req.URL.Path != "/3/movie/popular" {
			t.Errorf("expected path /3/movie/popular, got %s", req.URL.Path)
		}
		return makeJSONResponse(200, mockResponse)
	})

	result, err := service.GetPopularMovies(context.Background(), 1, 20)
	if err != nil {
		t.Fatalf("GetPopularMovies failed: %v", err)
	}

	if len(result.Results) != 1 {
		t.Errorf("expected 1 result, got %d", len(result.Results))
	}
	if result.Results[0].Title != "Popular Movie" {
		t.Errorf("expected title 'Popular Movie', got %s", result.Results[0].Title)
	}
}

func TestGetTVShowComplete(t *testing.T) {
	mockResponse := tmdb.TmdbTVDetail{
		ID:           1,
		Name:         "Test Show",
		Overview:     "Test Overview",
		PosterPath:   stringPtr("/poster.jpg"),
		FirstAirDate: "2023-01-01",
		Seasons: []tmdb.TmdbSeasonSummary{
			{
				ID:           1,
				SeasonNumber: 1,
				Name:         "Season 1",
				EpisodeCount: 10,
			},
		},
	}

	service := newTestService(func(req *http.Request) (*http.Response, error) {
		if req.URL.Path != "/3/tv/1" {
			t.Errorf("expected path /3/tv/1, got %s", req.URL.Path)
		}
		return makeJSONResponse(200, mockResponse)
	})

	result, err := service.GetTVShowComplete(context.Background(), 1, "US")
	if err != nil {
		t.Fatalf("GetTVShowComplete failed: %v", err)
	}

	if result.Title != "Test Show" {
		t.Errorf("expected title 'Test Show', got %s", result.Title)
	}
	if len(result.Seasons) != 1 {
		t.Errorf("expected 1 season, got %d", len(result.Seasons))
	}
}

func TestGetTrendingMovies_Error(t *testing.T) {
	service := newTestService(func(req *http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: 500,
			Body:       io.NopCloser(bytes.NewBufferString("Internal Server Error")),
		}, nil
	})

	_, err := service.GetPopularMovies(context.Background(), 1, 20)
	if err == nil {
		t.Error("expected error, got nil")
	}
}

func TestSearchMovies_EmptyResults(t *testing.T) {
	mockResponse := tmdb.TmdbSearchResponse{
		Page:         1,
		TotalPages:   1,
		TotalResults: 0,
		Results:      []tmdb.TmdbSearchResult{},
	}

	service := newTestService(func(req *http.Request) (*http.Response, error) {
		return makeJSONResponse(200, mockResponse)
	})

	result, err := service.SearchMovies(context.Background(), "test", 1, 20)
	if err != nil {
		t.Fatalf("SearchMovies failed: %v", err)
	}

	if len(result.Results) != 0 {
		t.Errorf("expected 0 results, got %d", len(result.Results))
	}
}
