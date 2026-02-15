package games

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/models"
	igdbclient "github.com/codeyee/denn-proxy/internal/providers/igdb"
)

type MockRoundTripper struct {
	Response *http.Response
	Err      error
}

func (m *MockRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return m.Response, m.Err
}

func TestSearchGames(t *testing.T) {
	mockData := []map[string]interface{}{
		{
			"id":   1,
			"name": "Zelda",
			"cover": map[string]interface{}{
				"url": "//images.igdb.com/igdb/image/upload/t_thumb/co123.jpg",
			},
			"first_release_date": 1600000000,
		},
	}
	mockBody, _ := json.Marshal(mockData)

	mockTransport := &MockRoundTripper{
		Response: &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(mockBody)),
			Header:     make(http.Header),
		},
	}

	mockHTTPClient := &http.Client{Transport: mockTransport}
	client := igdbclient.NewClient("test-id", "test-secret", clients.NoOpCache{}, clients.WithHTTPClient(mockHTTPClient))
	service := NewService(client)

	result, err := service.SearchGames(context.Background(), "Zelda", 10, 0)

	if err != nil {
		t.Fatalf("SearchGames failed: %v", err)
	}

	if len(result.Results) != 1 {
		t.Errorf("expected 1 result, got %d", len(result.Results))
	}

	if result.Results[0].ID != "1" {
		t.Errorf("expected ID '1', got %s", result.Results[0].ID)
	}

	if result.Results[0].Title != "Zelda" {
		t.Errorf("expected Title 'Zelda', got %s", result.Results[0].Title)
	}
}

func TestGetGameComplete(t *testing.T) {
	mockData := []map[string]interface{}{
		{
			"id":   123,
			"name": "Single Game",
			"genres": []map[string]interface{}{
				{"id": 1, "name": "RPG"},
			},
		},
	}
	mockBody, _ := json.Marshal(mockData)

	mockTransport := &MockRoundTripper{
		Response: &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(mockBody)),
			Header:     make(http.Header),
		},
	}

	mockHTTPClient := &http.Client{Transport: mockTransport}
	client := igdbclient.NewClient("test-id", "test-secret", clients.NoOpCache{}, clients.WithHTTPClient(mockHTTPClient))
	service := NewService(client)

	game, err := service.GetGameComplete(context.Background(), 123)
	if err != nil {
		t.Fatalf("GetGameComplete failed: %v", err)
	}

	if game.Title != "Single Game" {
		t.Errorf("expected Title 'Single Game', got %s", game.Title)
	}
	
	if len(game.Genres) != 1 || game.Genres[0] != "RPG" {
		t.Errorf("expected Genre RPG, got %v", game.Genres)
	}
}

func TestGetBulkGames(t *testing.T) {
	mockData := []map[string]interface{}{
		{"id": 1, "name": "Game 1"},
		{"id": 2, "name": "Game 2"},
	}
	mockBody, _ := json.Marshal(mockData)

	mockTransport := &MockRoundTripper{
		Response: &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(mockBody)),
			Header:     make(http.Header),
		},
	}

	mockHTTPClient := &http.Client{Transport: mockTransport}
	client := igdbclient.NewClient("test-id", "test-secret", clients.NoOpCache{}, clients.WithHTTPClient(mockHTTPClient))
	service := NewService(client)

	games, err := service.GetBulkGames(context.Background(), []int{1, 2})
	if err != nil {
		t.Fatalf("GetBulkGames failed: %v", err)
	}

	if len(games) != 2 {
		t.Errorf("expected 2 games, got %d", len(games))
	}
}

func TestGetPopularGames(t *testing.T) {
	mockData := []map[string]interface{}{
		{
			"id": 1, 
			"name": "Popular Game",
			"platforms": []map[string]interface{}{
				{"id": 6, "name": "PC"},
			},
		},
		{
			"id": 2, 
			"name": "Browser Game",
			"platforms": []map[string]interface{}{
				{"id": 82, "name": "Web browser"},
			},
		},
	}
	mockBody, _ := json.Marshal(mockData)

	mockTransport := &MockRoundTripper{
		Response: &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(mockBody)),
			Header:     make(http.Header),
		},
	}

	mockHTTPClient := &http.Client{Transport: mockTransport}
	client := igdbclient.NewClient("test-id", "test-secret", clients.NoOpCache{}, clients.WithHTTPClient(mockHTTPClient))
	service := NewService(client)

	games, err := service.GetPopularGames(context.Background(), 10, 0)
	if err != nil {
		t.Fatalf("GetPopularGames failed: %v", err)
	}

	// Browser game should be filtered out
	if len(games) != 1 {
		t.Errorf("expected 1 game (browser filtered), got %d", len(games))
	}
	
	if games[0].Title != "Popular Game" {
		t.Errorf("expected 'Popular Game', got %s", games[0].Title)
	}
}

type StatefulRoundTripper struct {
	responses map[string]*http.Response
}

func (m *StatefulRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	bodyData, _ := io.ReadAll(req.Body)
	
	req.Body = io.NopCloser(bytes.NewReader(bodyData))

	if bytes.Contains([]byte(req.URL.Path), []byte("popularity_primitives")) {
		var mockPrims []map[string]interface{}

		if bytes.Contains(bodyData, []byte("popularity_type = 2")) {
			// Want to play
			mockPrims = []map[string]interface{}{
				{"game_id": 1, "value": 100.0, "popularity_type": 2},
			}
		} else {
			// Visits
			mockPrims = []map[string]interface{}{
				{"game_id": 1, "value": 50.0, "popularity_type": 1},
			}
		}
		
		bodyBytes, _ := json.Marshal(mockPrims)
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(bodyBytes)),
			Header:     make(http.Header),
		}, nil
	}
	
	if bytes.Contains([]byte(req.URL.Path), []byte("games")) && bytes.Contains(bodyData, []byte("where id = (1)")) {
		// Bulk get details
		mockData := []map[string]interface{}{
			{
				"id": 1, "name": "Trending Game",
				"first_release_date": time.Now().Unix(), // Recent game
			},
		}
		bodyBytes, _ := json.Marshal(mockData)
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(bodyBytes)),
			Header:     make(http.Header),
		}, nil
	}
	
	// Default empty array
	return &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(bytes.NewReader([]byte("[]"))),
		Header:     make(http.Header),
	}, nil
}

func TestGetTrendingGames(t *testing.T) {
	mockTransport := &StatefulRoundTripper{}

	mockHTTPClient := &http.Client{Transport: mockTransport}
	client := igdbclient.NewClient("test-id", "test-secret", clients.NoOpCache{}, clients.WithHTTPClient(mockHTTPClient))
	service := NewService(client)

	games, err := service.GetTrendingGames(context.Background(), 10, 0)
	if err != nil {
		t.Fatalf("GetTrendingGames failed: %v", err)
	}

	if len(games) != 1 {
		t.Errorf("expected 1 game, got %d", len(games))
	}
	
	if games[0].Title != "Trending Game" {
		t.Errorf("expected 'Trending Game', got %s", games[0].Title)
	}
}

func TestGetTrendingGames_Fallback(t *testing.T) {
	stateful := &StatefulRoundTripperFallback{}
	
	mockHTTPClient := &http.Client{Transport: stateful}
	client := igdbclient.NewClient("test-id", "test-secret", clients.NoOpCache{}, clients.WithHTTPClient(mockHTTPClient))
	service := NewService(client)

	games, err := service.GetTrendingGames(context.Background(), 10, 0)
	if err != nil {
		t.Fatalf("Fallback failed: %v", err)
	}
	
	if len(games) != 1 || games[0].Title != "Popular Fallback" {
		t.Errorf("Expected fallback popular game, got %v", games)
	}
}

type StatefulRoundTripperFallback struct{}

func (m *StatefulRoundTripperFallback) RoundTrip(req *http.Request) (*http.Response, error) {
	if bytes.Contains([]byte(req.URL.Path), []byte("popularity_primitives")) {
		return &http.Response{
			StatusCode: http.StatusInternalServerError,
			Body:       io.NopCloser(bytes.NewReader(nil)),
			Header:     make(http.Header),
		}, nil
	}
	
	if bytes.Contains([]byte(req.URL.Path), []byte("games")) {
		mockData := []map[string]interface{}{
			{"id": 99, "name": "Popular Fallback"},
		}
		bodyBytes, _ := json.Marshal(mockData)
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(bodyBytes)),
			Header:     make(http.Header),
		}, nil
	}
	
	return nil, io.EOF
}

func TestCalculateScores(t *testing.T) {
	// Case 1: High popularity + recent
	game1 := models.Game{ID: "1", ReleaseDate: stringPtr(time.Now().Format("2006-01-02"))}
	score1 := calculateSingleGameScore(game1, map[int]float64{1: 100}, map[int]float64{1: 100}, 100, 100, time.Now().Unix())
	
	// Case 2: High popularity + old
	game2 := models.Game{ID: "1", ReleaseDate: stringPtr(time.Now().AddDate(-1, 0, 0).Format("2006-01-02"))}
	score2 := calculateSingleGameScore(game2, map[int]float64{1: 100}, map[int]float64{1: 100}, 100, 100, time.Now().Unix())
	
	if score1 <= score2 {
		t.Errorf("Recent game should have higher score than old game with same stats")
	}
}
