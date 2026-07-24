package multisearch

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/models"
	"github.com/codeyee/denn-proxy/internal/testutil"

	booksservice "github.com/codeyee/denn-proxy/internal/services/books/service"
	gamesservice "github.com/codeyee/denn-proxy/internal/services/games/service"
	spotifyservice "github.com/codeyee/denn-proxy/internal/services/spotify/service"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb/service"
)

type mockVideo struct {
	moviesResult tmdbservice.SearchResult
	moviesErr    error
	tvResult     tmdbservice.SearchResult
	tvErr        error
}

func (m *mockVideo) SearchMovies(_ context.Context, _ string, _, _ int) (tmdbservice.SearchResult, error) {
	return m.moviesResult, m.moviesErr
}

func (m *mockVideo) SearchTVShows(_ context.Context, _ string, _, _ int) (tmdbservice.SearchResult, error) {
	return m.tvResult, m.tvErr
}

type mockGames struct {
	result gamesservice.SearchResult
	err    error
}

func (m *mockGames) SearchGames(_ context.Context, _ string, _, _ int) (gamesservice.SearchResult, error) {
	return m.result, m.err
}

type deadlineGames struct{}

func (*deadlineGames) SearchGames(
	ctx context.Context,
	_ string,
	_, _ int,
) (gamesservice.SearchResult, error) {
	<-ctx.Done()
	return gamesservice.SearchResult{}, ctx.Err()
}

type mockSpotify struct {
	result spotifyservice.SearchResult
	err    error
}

func (m *mockSpotify) SearchAlbums(_ context.Context, _ string, _, _ int) (spotifyservice.SearchResult, error) {
	return m.result, m.err
}

type mockBooks struct {
	result booksservice.SearchResult
	err    error
}

func (m *mockBooks) SearchBooks(_ context.Context, _ string, _, _ int) (booksservice.SearchResult, error) {
	return m.result, m.err
}

func setupRouter(tmdb VideoService, games GamesService, spotify SpotifyService, books BooksService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewHandler(tmdb, games, spotify, books)
	r.GET("/search", h.Search)
	return r
}

func doRequest(r *gin.Engine, url string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", url, nil)
	r.ServeHTTP(w, req)
	return w
}

func decodeResponse(t *testing.T, w *httptest.ResponseRecorder) map[string]json.RawMessage {
	t.Helper()
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(w.Body.Bytes(), &raw); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}
	return raw
}

func decodeContentResult(t *testing.T, data json.RawMessage) ContentResult {
	t.Helper()
	var cr ContentResult
	if err := json.Unmarshal(data, &cr); err != nil {
		t.Fatalf("Failed to decode content result: %v", err)
	}
	return cr
}

func decodeErrorResponse(t *testing.T, w *httptest.ResponseRecorder) map[string]interface{} {
	t.Helper()
	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to decode error response: %v", err)
	}
	return resp
}

func TestMultiSearchCacheKeyScopesAllPayloadInputs(t *testing.T) {
	base := multiSearchCacheKey(" Dune ", 1, 20, "CO", []contentType{typeMovies})
	cases := []string{
		multiSearchCacheKey("Foundation", 1, 20, "CO", []contentType{typeMovies}),
		multiSearchCacheKey("Dune", 2, 20, "CO", []contentType{typeMovies}),
		multiSearchCacheKey("Dune", 1, 10, "CO", []contentType{typeMovies}),
		multiSearchCacheKey("Dune", 1, 20, "US", []contentType{typeMovies}),
		multiSearchCacheKey("Dune", 1, 20, "CO", []contentType{typeBooks}),
	}
	for _, candidate := range cases {
		if candidate == base {
			t.Fatalf("cache key collision for distinct inputs: %s", candidate)
		}
	}
	if normalized := multiSearchCacheKey("dune", 1, 20, "CO", []contentType{typeMovies}); normalized != base {
		t.Fatalf("expected normalized query key, got %s and %s", base, normalized)
	}
}

func TestMultiSearchCachesAggregateResponse(t *testing.T) {
	tmdb, games, spotify, books := defaultMocks()
	cache := testutil.NewMemoryCache()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewHandler(tmdb, games, spotify, books, cache)
	r.GET("/search", h.Search)

	first := doRequest(r, "/search?q=dune&limit=5")
	second := doRequest(r, "/search?q=dune&limit=5")

	if first.Header().Get("X-Cache") != "MISS" {
		t.Fatalf("expected first request MISS, got %q", first.Header().Get("X-Cache"))
	}
	if second.Header().Get("X-Cache") != "HIT" {
		t.Fatalf("expected second request HIT, got %q", second.Header().Get("X-Cache"))
	}
	if first.Body.String() != second.Body.String() {
		t.Fatal("cached response differs from original response")
	}
}

func TestMultiSearchSlowBucketReturnsPartialResponseInsideBudget(t *testing.T) {
	tmdb, _, spotify, books := defaultMocks()
	r := setupRouter(tmdb, &deadlineGames{}, spotify, books)

	started := time.Now()
	response := doRequest(r, "/search?q=dune&limit=5")
	elapsed := time.Since(started)

	if response.Code != http.StatusOK {
		t.Fatalf("expected partial 200, got %d", response.Code)
	}
	if elapsed >= searchTotalBudget {
		t.Fatalf("slow bucket exceeded aggregate budget: %v", elapsed)
	}
	raw := decodeResponse(t, response)
	if decodeContentResult(t, raw["movies"]).Error != nil {
		t.Fatal("fast movie bucket should remain available")
	}
	if decodeContentResult(t, raw["games"]).Error == nil {
		t.Fatal("slow games bucket should expose its timeout")
	}
}

func defaultMocks() (*mockVideo, *mockGames, *mockSpotify, *mockBooks) {
	tmdb := &mockVideo{
		moviesResult: tmdbservice.SearchResult{
			Page: 1, TotalPages: 5, TotalResults: 100,
			Results: []models.SearchItem{{ID: "1", Type: "movie", Title: "Test Movie"}},
		},
		tvResult: tmdbservice.SearchResult{
			Page: 1, TotalPages: 3, TotalResults: 60,
			Results: []models.SearchItem{{ID: "2", Type: "tv_show", Title: "Test Show"}},
		},
	}
	games := &mockGames{
		result: gamesservice.SearchResult{
			Results: []models.SearchItem{{ID: "3", Type: "game", Title: "Test Game"}},
		},
	}
	spotify := &mockSpotify{
		result: spotifyservice.SearchResult{
			Page: 1, TotalPages: 2, TotalResults: 40,
			Results: []models.SearchItem{{ID: "4", Type: "album", Title: "Test Album"}},
		},
	}
	books := &mockBooks{
		result: booksservice.SearchResult{
			Page: 1, TotalPages: 1, TotalResults: 8,
			Results: []models.SearchItem{{ID: "5", Type: "book", Title: "Test Book"}},
		},
	}
	return tmdb, games, spotify, books
}

func TestSearch_AllTypes(t *testing.T) {
	tmdb, games, spotify, books := defaultMocks()
	r := setupRouter(tmdb, games, spotify, books)

	w := doRequest(r, "/search?q=test")

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	raw := decodeResponse(t, w)

	// All 5 keys must be present
	expectedKeys := []string{"movies", "tv-shows", "games", "albums", "books"}
	for _, key := range expectedKeys {
		if _, ok := raw[key]; !ok {
			t.Errorf("Expected key %q in response", key)
		}
	}

	// Verify each group has correct data
	moviesCR := decodeContentResult(t, raw["movies"])
	if len(moviesCR.Results) != 1 || moviesCR.Results[0].Title != "Test Movie" {
		t.Errorf("Expected 1 movie 'Test Movie', got %+v", moviesCR.Results)
	}
	if moviesCR.Metadata == nil || moviesCR.Metadata.TotalResults != 100 {
		t.Errorf("Expected movies metadata with 100 total results, got %+v", moviesCR.Metadata)
	}
	if moviesCR.Error != nil {
		t.Errorf("Expected no error for movies, got %v", *moviesCR.Error)
	}

	tvCR := decodeContentResult(t, raw["tv-shows"])
	if len(tvCR.Results) != 1 || tvCR.Results[0].Title != "Test Show" {
		t.Errorf("Expected 1 tv show 'Test Show', got %+v", tvCR.Results)
	}

	gamesCR := decodeContentResult(t, raw["games"])
	if len(gamesCR.Results) != 1 || gamesCR.Results[0].Title != "Test Game" {
		t.Errorf("Expected 1 game 'Test Game', got %+v", gamesCR.Results)
	}
	if gamesCR.Metadata == nil {
		t.Error("Expected metadata for games, got nil")
	}

	musicCR := decodeContentResult(t, raw["albums"])
	if len(musicCR.Results) != 1 || musicCR.Results[0].Title != "Test Album" {
		t.Errorf("Expected 1 album 'Test Album', got %+v", musicCR.Results)
	}

	booksCR := decodeContentResult(t, raw["books"])
	if len(booksCR.Results) != 1 || booksCR.Results[0].Title != "Test Book" {
		t.Errorf("Expected 1 book 'Test Book', got %+v", booksCR.Results)
	}
}

func TestSearch_FilteredTypes(t *testing.T) {
	tmdb, games, spotify, books := defaultMocks()
	r := setupRouter(tmdb, games, spotify, books)

	w := doRequest(r, "/search?q=test&types=movies,games")

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	raw := decodeResponse(t, w)

	// Only movies and games should be present
	if _, ok := raw["movies"]; !ok {
		t.Error("Expected 'movies' in response")
	}
	if _, ok := raw["games"]; !ok {
		t.Error("Expected 'games' in response")
	}

	// Others should NOT be present
	for _, key := range []string{"tv-shows", "albums", "books"} {
		if _, ok := raw[key]; ok {
			t.Errorf("Did not expect key %q in response", key)
		}
	}
}

func TestSearch_MissingQuery(t *testing.T) {
	tmdb, games, spotify, books := defaultMocks()
	r := setupRouter(tmdb, games, spotify, books)

	w := doRequest(r, "/search")

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", w.Code)
	}

	resp := decodeErrorResponse(t, w)
	if resp["error"] != "MISSING_PARAMETER" {
		t.Errorf("Expected error MISSING_PARAMETER, got %v", resp["error"])
	}
}

func TestSearch_EmptyQuery(t *testing.T) {
	tmdb, games, spotify, books := defaultMocks()
	r := setupRouter(tmdb, games, spotify, books)

	w := doRequest(r, "/search?q=")

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", w.Code)
	}
}

func TestSearch_InvalidType(t *testing.T) {
	tmdb, games, spotify, books := defaultMocks()

	r := setupRouter(tmdb, games, spotify, books)
	w := doRequest(r, "/search?q=test&types=movies,podcasts")

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", w.Code)
	}

	resp := decodeErrorResponse(t, w)
	if resp["error"] != "INVALID_PARAMETER" {
		t.Errorf("Expected error INVALID_PARAMETER, got %v", resp["error"])
	}
}

func TestSearch_CaseInsensitiveTypes(t *testing.T) {
	tmdb, games, spotify, books := defaultMocks()
	r := setupRouter(tmdb, games, spotify, books)

	w := doRequest(r, "/search?q=test&types=MOVIES,Tv-Shows")

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	raw := decodeResponse(t, w)

	if _, ok := raw["movies"]; !ok {
		t.Error("Expected 'movies' in response")
	}
	if _, ok := raw["tv-shows"]; !ok {
		t.Error("Expected 'tv-shows' in response")
	}
}

func TestSearch_DuplicateTypes(t *testing.T) {
	tmdb, games, spotify, books := defaultMocks()
	r := setupRouter(tmdb, games, spotify, books)

	w := doRequest(r, "/search?q=test&types=movies,movies,games")

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	raw := decodeResponse(t, w)

	// Should have exactly 2 keys (movies deduplicated)
	if len(raw) != 2 {
		t.Errorf("Expected 2 keys in response (movies, games), got %d", len(raw))
	}
}

func TestSearch_PartialFailure(t *testing.T) {
	tmdb, games, spotify, books := defaultMocks()

	// Make games service fail
	games.err = fmt.Errorf("IGDB connection refused")

	r := setupRouter(tmdb, games, spotify, books)
	w := doRequest(r, "/search?q=test")

	// Should still be 200 — partial failure is OK
	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	raw := decodeResponse(t, w)

	// Movies should succeed
	moviesCR := decodeContentResult(t, raw["movies"])
	if moviesCR.Error != nil {
		t.Errorf("Expected no error for movies, got %v", *moviesCR.Error)
	}
	if len(moviesCR.Results) != 1 {
		t.Errorf("Expected 1 movie result, got %d", len(moviesCR.Results))
	}

	// Games should have error and empty results
	gamesCR := decodeContentResult(t, raw["games"])
	if gamesCR.Error == nil {
		t.Fatal("Expected error for games, got nil")
	}
	if *gamesCR.Error != "IGDB connection refused" {
		t.Errorf("Expected error message 'IGDB connection refused', got %q", *gamesCR.Error)
	}
	if len(gamesCR.Results) != 0 {
		t.Errorf("Expected 0 game results on error, got %d", len(gamesCR.Results))
	}
	if gamesCR.Metadata != nil {
		t.Errorf("Expected nil metadata on error, got %+v", gamesCR.Metadata)
	}
}

func TestSearch_AllServicesFail(t *testing.T) {
	tmdb := &mockVideo{
		moviesErr: fmt.Errorf("TMDB down"),
		tvErr:     fmt.Errorf("TMDB down"),
	}
	games := &mockGames{err: fmt.Errorf("IGDB down")}
	spotify := &mockSpotify{err: fmt.Errorf("Spotify down")}
	books := &mockBooks{err: fmt.Errorf("OpenLibrary down")}

	r := setupRouter(tmdb, games, spotify, books)
	w := doRequest(r, "/search?q=test")

	// Still 200 — all groups have errors
	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	raw := decodeResponse(t, w)

	for _, key := range []string{"movies", "tv-shows", "games", "albums", "books"} {
		cr := decodeContentResult(t, raw[key])
		if cr.Error == nil {
			t.Errorf("Expected error for %s, got nil", key)
		}
		if len(cr.Results) != 0 {
			t.Errorf("Expected 0 results for %s, got %d", key, len(cr.Results))
		}
	}
}

func TestSearch_EmptyResults(t *testing.T) {
	tmdb := &mockVideo{
		moviesResult: tmdbservice.SearchResult{Page: 1, TotalPages: 0, TotalResults: 0},
		tvResult:     tmdbservice.SearchResult{Page: 1, TotalPages: 0, TotalResults: 0},
	}
	games := &mockGames{result: gamesservice.SearchResult{}}
	spotify := &mockSpotify{result: spotifyservice.SearchResult{Page: 1, TotalPages: 0, TotalResults: 0}}
	books := &mockBooks{result: booksservice.SearchResult{Page: 1, TotalPages: 0, TotalResults: 0}}

	r := setupRouter(tmdb, games, spotify, books)
	w := doRequest(r, "/search?q=nonexistent")

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	raw := decodeResponse(t, w)

	for _, key := range []string{"movies", "tv-shows", "games", "albums", "books"} {
		cr := decodeContentResult(t, raw[key])
		if cr.Error != nil {
			t.Errorf("Expected no error for %s, got %v", key, *cr.Error)
		}
		if len(cr.Results) != 0 {
			t.Errorf("Expected 0 results for %s, got %d", key, len(cr.Results))
		}
	}
}

func TestSearch_SingleType(t *testing.T) {
	tmdb, games, spotify, books := defaultMocks()

	r := setupRouter(tmdb, games, spotify, books)
	w := doRequest(r, "/search?q=test&types=books")

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	raw := decodeResponse(t, w)

	if len(raw) != 1 {
		t.Errorf("Expected 1 key in response, got %d", len(raw))
	}

	if _, ok := raw["books"]; !ok {
		t.Error("Expected 'books' in response")
	}
}

func TestSearch_AlbumsKey(t *testing.T) {
	tmdb, games, spotify, books := defaultMocks()

	r := setupRouter(tmdb, games, spotify, books)
	w := doRequest(r, "/search?q=test&types=albums")

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	raw := decodeResponse(t, w)

	if _, ok := raw["albums"]; !ok {
		t.Error("Expected 'albums' key in response when requesting albums type")
	}
}
