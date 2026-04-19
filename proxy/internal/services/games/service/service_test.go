package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/models"
	igdbclient "github.com/codeyee/denn-proxy/internal/providers/igdb"
	"github.com/codeyee/denn-proxy/internal/services/games"
	"github.com/codeyee/denn-proxy/internal/testutil"
)

const (
	twitchAuthHost = "id.twitch.tv"
	igdbAPIHost    = "api.igdb.com"
)

// twitchTokenHandler returns a static OAuth token. Mounted on the auth host
// inside every test so the underlying provider can satisfy its token flow
// without any real network IO.
func twitchTokenHandler() testutil.RoundTripFunc {
	return testutil.StaticJSON(http.StatusOK, map[string]any{
		"access_token": "test-token",
		"expires_in":   3600,
		"token_type":   "bearer",
	})
}

// newServiceWithAPI wires a games service whose IGDB API host responds with
// the given body and status. The auth host always returns a valid token. Use
// extraOpts to add WithNoRetry / WithRetryConfig in error-path tests.
func newServiceWithAPI(t *testing.T, apiBody []byte, apiStatus int, extraOpts ...clients.ClientOption) *Service {
	t.Helper()
	rt := testutil.MultiHost(
		testutil.HostHandler{Host: twitchAuthHost, Fn: twitchTokenHandler()},
		testutil.HostHandler{Host: igdbAPIHost, Fn: testutil.StaticJSON(apiStatus, json.RawMessage(apiBody))},
	)
	opts := append([]clients.ClientOption{clients.WithHTTPClient(testutil.HTTPClient(rt))}, extraOpts...)
	client := igdbclient.NewClient("test-id", "test-secret", clients.NoOpCache{}, opts...)
	return NewService(client)
}

// newServiceWithRouter exposes the full transport for tests that need to
// distinguish requests by URL path or body.
func newServiceWithRouter(t *testing.T, rt http.RoundTripper, extraOpts ...clients.ClientOption) *Service {
	t.Helper()
	opts := append([]clients.ClientOption{clients.WithHTTPClient(testutil.HTTPClient(rt))}, extraOpts...)
	client := igdbclient.NewClient("test-id", "test-secret", clients.NoOpCache{}, opts...)
	return NewService(client)
}

func TestSearchGames(t *testing.T) {
	mockGames := []games.IgdbGame{
		{
			ID:   1,
			Name: "Test Game",
			Cover: games.IgdbImage{
				ID:      100,
				Url:     "//images.igdb.com/igdb/image/upload/t_thumb/test.jpg",
				ImageID: "test_image_id",
			},
			FirstReleaseDate: 1672531200,
		},
	}
	mockBody, _ := json.Marshal(mockGames)
	service := newServiceWithAPI(t, mockBody, http.StatusOK)

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
	if result.Results[0].Title != "Test Game" {
		t.Errorf("expected Title 'Test Game', got %s", result.Results[0].Title)
	}
}

func TestGetGameComplete(t *testing.T) {
	mockData := []map[string]any{
		{
			"id":   123,
			"name": "Single Game",
			"genres": []map[string]any{
				{"id": 1, "name": "RPG"},
			},
		},
	}
	mockBody, _ := json.Marshal(mockData)
	service := newServiceWithAPI(t, mockBody, http.StatusOK)

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

func TestGetGameCompleteEmptyResponseReturnsErrNotFound(t *testing.T) {
	// Regression: IGDB returns 200 OK with `[]` for IDs that don't exist.
	// The service used to return a generic fmt.Errorf("game not found") that
	// the handler couldn't classify, so the proxy responded 500 instead of 404.
	mockBody, _ := json.Marshal([]map[string]any{})
	service := newServiceWithAPI(t, mockBody, http.StatusOK)

	_, err := service.GetGameComplete(context.Background(), 305556)
	if err == nil {
		t.Fatal("expected error for empty IGDB response, got nil")
	}
	if !errors.Is(err, clients.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestGetBulkGames(t *testing.T) {
	mockData := []map[string]any{
		{"id": 1, "name": "Game 1"},
		{"id": 2, "name": "Game 2"},
	}
	mockBody, _ := json.Marshal(mockData)
	service := newServiceWithAPI(t, mockBody, http.StatusOK)

	games, err := service.GetBulkGames(context.Background(), []int{1, 2})
	if err != nil {
		t.Fatalf("GetBulkGames failed: %v", err)
	}
	if len(games) != 2 {
		t.Errorf("expected 2 games, got %d", len(games))
	}
}

func TestGetPopularGames(t *testing.T) {
	mockData := []map[string]any{
		{
			"id":   1,
			"name": "Popular Game",
			"platforms": []map[string]any{
				{"id": 6, "name": "PC"},
			},
		},
		{
			"id":   2,
			"name": "Browser Game",
			"platforms": []map[string]any{
				{"id": 82, "name": "Web browser"},
			},
		},
	}
	mockBody, _ := json.Marshal(mockData)
	service := newServiceWithAPI(t, mockBody, http.StatusOK)

	games, err := service.GetPopularGames(context.Background(), 10, 0)
	if err != nil {
		t.Fatalf("GetPopularGames failed: %v", err)
	}
	if len(games) != 1 {
		t.Errorf("expected 1 game (browser filtered), got %d", len(games))
	}
	if games[0].Title != "Popular Game" {
		t.Errorf("expected 'Popular Game', got %s", games[0].Title)
	}
}

// trendingRouter routes requests by IGDB endpoint and request body. It avoids
// the brittle "where id = (1)" body-substring matching of the previous test
// suite by parsing the IGDB endpoint segment instead.
func trendingRouter(t *testing.T, gameDetail map[string]any, popularityType2, popularityType1 []map[string]any) http.RoundTripper {
	t.Helper()
	return testutil.MultiHost(
		testutil.HostHandler{Host: twitchAuthHost, Fn: twitchTokenHandler()},
		testutil.HostHandler{Host: igdbAPIHost, Fn: func(req *http.Request) (*http.Response, error) {
			body, _ := io.ReadAll(req.Body)
			req.Body = io.NopCloser(bytes.NewReader(body))

			switch {
			case strings.Contains(req.URL.Path, "popularity_primitives"):
				if bytes.Contains(body, []byte("popularity_type = 2")) {
					return testutil.JSONResponse(http.StatusOK, popularityType2), nil
				}
				return testutil.JSONResponse(http.StatusOK, popularityType1), nil
			case strings.Contains(req.URL.Path, "games"):
				return testutil.JSONResponse(http.StatusOK, []map[string]any{gameDetail}), nil
			default:
				return testutil.JSONResponse(http.StatusOK, []any{}), nil
			}
		}},
	)
}

func TestGetTrendingGames(t *testing.T) {
	rt := trendingRouter(t,
		map[string]any{
			"id":                 1,
			"name":               "Trending Game",
			"first_release_date": time.Now().Unix(),
		},
		[]map[string]any{{"game_id": 1, "value": 100.0, "popularity_type": 2}},
		[]map[string]any{{"game_id": 1, "value": 50.0, "popularity_type": 1}},
	)
	service := newServiceWithRouter(t, rt)

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
	rt := testutil.MultiHost(
		testutil.HostHandler{Host: twitchAuthHost, Fn: twitchTokenHandler()},
		testutil.HostHandler{Host: igdbAPIHost, Fn: func(req *http.Request) (*http.Response, error) {
			switch {
			case strings.Contains(req.URL.Path, "popularity_primitives"):
				return testutil.JSONResponse(http.StatusInternalServerError, map[string]string{"error": "boom"}), nil
			case strings.Contains(req.URL.Path, "games"):
				return testutil.JSONResponse(http.StatusOK, []map[string]any{
					{"id": 99, "name": "Popular Fallback"},
				}), nil
			default:
				return testutil.JSONResponse(http.StatusOK, []any{}), nil
			}
		}},
	)
	// WithNoRetry: the popularity endpoint returns 500 deliberately to trigger
	// the fallback path; without disabling retries the test would loop for
	// ~30s before the service tries the popular endpoint.
	service := newServiceWithRouter(t, rt, clients.WithNoRetry())

	games, err := service.GetTrendingGames(context.Background(), 10, 0)
	if err != nil {
		t.Fatalf("Fallback failed: %v", err)
	}
	if len(games) != 1 || games[0].Title != "Popular Fallback" {
		t.Errorf("Expected fallback popular game, got %v", games)
	}
}

func TestCalculateScores(t *testing.T) {
	game1 := models.Game{ID: "1", ReleaseDate: stringPtr(time.Now().Format("2006-01-02"))}
	score1 := calculateSingleGameScore(game1, map[int]float64{1: 100}, map[int]float64{1: 100}, 100, 100, time.Now().Unix())

	game2 := models.Game{ID: "1", ReleaseDate: stringPtr(time.Now().AddDate(-1, 0, 0).Format("2006-01-02"))}
	score2 := calculateSingleGameScore(game2, map[int]float64{1: 100}, map[int]float64{1: 100}, 100, 100, time.Now().Unix())

	if score1 <= score2 {
		t.Errorf("Recent game should have higher score than old game with same stats")
	}
}

func TestCalculateRecencyMultiplier(t *testing.T) {
	now := time.Now().Unix()
	day := int64(86400)

	tests := []struct {
		name        string
		releaseDate *string
		expected    float64
	}{
		{"Nil date", nil, 1.0},
		{"Future date", stringPtr("2999-01-01"), 0.0},
		{"Just released", stringPtr(time.Unix(now-day, 0).Format("2006-01-02")), MaxRecencyBoost},
		{"60 days old", stringPtr(time.Unix(now-(60*day), 0).Format("2006-01-02")), MaxRecencyBoost * 0.6},
		{"Old game", stringPtr("2000-01-01"), 1.0},
	}

	for _, tt := range tests {
		got := calculateRecencyMultiplier(tt.releaseDate, now)
		if abs(got-tt.expected) > 0.001 {
			t.Errorf("%s: expected %v, got %v", tt.name, tt.expected, got)
		}
	}
}

func stringPtr(s string) *string {
	return &s
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}
