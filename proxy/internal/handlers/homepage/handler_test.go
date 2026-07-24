package homepage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/models"
	"github.com/codeyee/denn-proxy/internal/testutil"

	booksservice "github.com/codeyee/denn-proxy/internal/services/books/service"
	spotifyservice "github.com/codeyee/denn-proxy/internal/services/spotify/service"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb/service"
)

type mockVideo struct {
	popularMovies    tmdbservice.SearchResult
	popularMoviesErr error
	popularTV        tmdbservice.SearchResult
	popularTVErr     error
	bulkMovies       []tmdbservice.BulkMovieResult
	bulkTVShows      []tmdbservice.BulkTVShowResult
}

func (m *mockVideo) GetPopularMovies(_ context.Context, _, _ int) (tmdbservice.SearchResult, error) {
	return m.popularMovies, m.popularMoviesErr
}

func (m *mockVideo) GetPopularTVShows(_ context.Context, _, _ int) (tmdbservice.SearchResult, error) {
	return m.popularTV, m.popularTVErr
}

func (m *mockVideo) GetBulkMoviePreviews(_ context.Context, _ []int, _ string) []tmdbservice.BulkMovieResult {
	return m.bulkMovies
}

func (m *mockVideo) GetBulkTVShowPreviews(_ context.Context, _ []int, _ string) []tmdbservice.BulkTVShowResult {
	return m.bulkTVShows
}

type mockGames struct {
	trendingDetail []models.Game
	trendingErr    error
}

func (m *mockGames) GetTrendingGamesDetail(_ context.Context, _, _ int) ([]models.Game, error) {
	return m.trendingDetail, m.trendingErr
}

type deadlineGames struct{}

func (*deadlineGames) GetTrendingGamesDetail(
	ctx context.Context,
	_, _ int,
) ([]models.Game, error) {
	<-ctx.Done()
	return nil, ctx.Err()
}

type mockSpotify struct {
	trendingResult spotifyservice.SearchResult
	trendingErr    error
	bulkAlbums     []spotifyservice.BulkAlbumResult
}

func (m *mockSpotify) GetTrendingAlbums(_ context.Context, _, _ int) (spotifyservice.SearchResult, error) {
	return m.trendingResult, m.trendingErr
}

func (m *mockSpotify) GetBulkAlbums(_ context.Context, _ []string) []spotifyservice.BulkAlbumResult {
	return m.bulkAlbums
}

type mockBooks struct {
	trendingResult booksservice.SearchResult
	trendingErr    error
	bulkBooks      []booksservice.BulkBookResult
}

func (m *mockBooks) GetTrendingBooks(_ context.Context, _, _ int) (booksservice.SearchResult, error) {
	return m.trendingResult, m.trendingErr
}

func (m *mockBooks) GetBulkBooks(_ context.Context, _ []string) []booksservice.BulkBookResult {
	return m.bulkBooks
}

func setupRouter(video VideoService, games GamesService, spotify SpotifyService, books BooksService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewHandler(video, games, spotify, books, clients.NoOpCache{})
	r.GET("/homepage", h.Homepage)
	return r
}

func doRequest(r *gin.Engine, url string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", url, nil)
	r.ServeHTTP(w, req)
	return w
}

func doRequestWithCountry(r *gin.Engine, url, country string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("X-User-Country", country)
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

func TestHomepageCacheKeyScopesCountryAndPolicy(t *testing.T) {
	co := homepageCacheKey(1, 10, "CO")
	us := homepageCacheKey(1, 10, "US")
	if co == us {
		t.Fatal("country-specific homepage payloads must not share a cache key")
	}
	if co == homepageCacheKey(2, 10, "CO") {
		t.Fatal("pages must not share a cache key")
	}
	if stale := homepageStaleCacheKey(1, 10, "CO"); stale == co {
		t.Fatal("fresh and stale cache entries must use distinct keys")
	}
}

func TestHomepageCachesAndServesAggregate(t *testing.T) {
	video, games, spotify, books := defaultMocks()
	cache := testutil.NewMemoryCache()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewHandler(video, games, spotify, books, cache)
	r.GET("/homepage", h.Homepage)

	first := doRequest(r, "/homepage?limit=5")
	second := doRequest(r, "/homepage?limit=5")

	if first.Header().Get("X-Cache") != "MISS" {
		t.Fatalf("expected MISS, got %q", first.Header().Get("X-Cache"))
	}
	if second.Header().Get("X-Cache") != "HIT" {
		t.Fatalf("expected HIT, got %q", second.Header().Get("X-Cache"))
	}
	if first.Body.String() != second.Body.String() {
		t.Fatal("cache changed the aggregate payload")
	}
}

func TestHomepageServesStaleImmediately(t *testing.T) {
	video, games, spotify, books := defaultMocks()
	cache := testutil.NewMemoryCache()
	stalePayload := []byte(`{"movies":{"metadata":null,"results":[],"error":null}}`)
	if err := cache.Set(
		context.Background(),
		homepageStaleCacheKey(1, 5, "US"),
		stalePayload,
		HomepageStaleTTL,
	); err != nil {
		t.Fatal(err)
	}
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewHandler(video, games, spotify, books, cache)
	r.GET("/homepage", h.Homepage)

	started := time.Now()
	response := doRequest(r, "/homepage?limit=5")
	if elapsed := time.Since(started); elapsed > 100*time.Millisecond {
		t.Fatalf("stale response should be immediate, took %v", elapsed)
	}
	if response.Header().Get("X-Cache") != "STALE" {
		t.Fatalf("expected STALE, got %q", response.Header().Get("X-Cache"))
	}
	if response.Body.String() != string(stalePayload) {
		t.Fatal("did not serve the stale payload verbatim")
	}
}

func TestHomepageCacheFailureFailsOpen(t *testing.T) {
	video, games, spotify, books := defaultMocks()
	cache := testutil.NewMemoryCache()
	cache.Err = errors.New("redis down")
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewHandler(video, games, spotify, books, cache)
	r.GET("/homepage", h.Homepage)

	response := doRequest(r, "/homepage?limit=5")
	if response.Code != http.StatusOK {
		t.Fatalf("expected cache failure to fail open, got %d", response.Code)
	}
}

type countingVideo struct {
	delegate *mockVideo
	calls    atomic.Int32
}

func (m *countingVideo) GetPopularMovies(ctx context.Context, page, limit int) (tmdbservice.SearchResult, error) {
	m.calls.Add(1)
	time.Sleep(50 * time.Millisecond)
	return m.delegate.GetPopularMovies(ctx, page, limit)
}

func (m *countingVideo) GetPopularTVShows(ctx context.Context, page, limit int) (tmdbservice.SearchResult, error) {
	m.calls.Add(1)
	time.Sleep(50 * time.Millisecond)
	return m.delegate.GetPopularTVShows(ctx, page, limit)
}

func (m *countingVideo) GetBulkMoviePreviews(ctx context.Context, ids []int, country string) []tmdbservice.BulkMovieResult {
	return m.delegate.GetBulkMoviePreviews(ctx, ids, country)
}

func (m *countingVideo) GetBulkTVShowPreviews(ctx context.Context, ids []int, country string) []tmdbservice.BulkTVShowResult {
	return m.delegate.GetBulkTVShowPreviews(ctx, ids, country)
}

func TestHomepageSingleflightCollapsesConcurrentMisses(t *testing.T) {
	video, games, spotify, books := defaultMocks()
	counted := &countingVideo{delegate: video}
	h := NewHandler(counted, games, spotify, books, clients.NoOpCache{})
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/homepage", h.Homepage)

	var wg sync.WaitGroup
	wg.Add(2)
	responses := make([]*httptest.ResponseRecorder, 2)
	for index := range responses {
		go func(position int) {
			defer wg.Done()
			responses[position] = doRequest(r, "/homepage?limit=5")
		}(index)
	}
	wg.Wait()

	for _, response := range responses {
		if response.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", response.Code)
		}
	}
	if got := counted.calls.Load(); got != 2 {
		t.Fatalf("expected one movies and one TV computation, got %d provider calls", got)
	}
}

func TestHomepageSlowBucketReturnsPartialResponseInsideBudget(t *testing.T) {
	video, _, spotify, books := defaultMocks()
	r := setupRouter(video, &deadlineGames{}, spotify, books)

	started := time.Now()
	response := doRequest(r, "/homepage?limit=5")
	elapsed := time.Since(started)

	if response.Code != http.StatusOK {
		t.Fatalf("expected partial 200, got %d", response.Code)
	}
	if elapsed >= homepageTotalBudget {
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
	movie := &models.Movie{ID: "1", ContentType: "movie", Title: "Popular Movie"}
	tvShow := &models.TVShow{ID: "2", ContentType: "tv_show", Title: "Popular Show"}
	album := &models.Album{ID: "a1", ContentType: "album", Title: "Popular Album"}
	book := &models.Book{ID: "b1", ContentType: "book", Title: "Popular Book"}

	video := &mockVideo{
		popularMovies: tmdbservice.SearchResult{
			Page: 1, TotalPages: 5, TotalResults: 100,
			Results: []models.SearchItem{{ID: "1", Type: "movie", Title: "Popular Movie"}},
		},
		popularTV: tmdbservice.SearchResult{
			Page: 1, TotalPages: 3, TotalResults: 60,
			Results: []models.SearchItem{{ID: "2", Type: "tv_show", Title: "Popular Show"}},
		},
		bulkMovies:  []tmdbservice.BulkMovieResult{{ID: 1, Movie: movie}},
		bulkTVShows: []tmdbservice.BulkTVShowResult{{ID: 2, TVShow: tvShow}},
	}

	games := &mockGames{
		trendingDetail: []models.Game{{ID: "3", ContentType: "game", Title: "Trending Game"}},
	}

	spotify := &mockSpotify{
		trendingResult: spotifyservice.SearchResult{
			Page: 1, TotalPages: 2, TotalResults: 40,
			Results: []models.SearchItem{{ID: "a1", Type: "album", Title: "Popular Album"}},
		},
		bulkAlbums: []spotifyservice.BulkAlbumResult{{ID: "a1", Album: album}},
	}

	books := &mockBooks{
		trendingResult: booksservice.SearchResult{
			Page: 1, TotalPages: 1, TotalResults: 8,
			Results: []models.SearchItem{{ID: "b1", Type: "book", Title: "Popular Book"}},
		},
		bulkBooks: []booksservice.BulkBookResult{{ID: "b1", Book: book}},
	}

	return video, games, spotify, books
}

func TestHomepage_AllTypes(t *testing.T) {
	video, games, spotify, books := defaultMocks()

	r := setupRouter(video, games, spotify, books)
	w := doRequest(r, "/homepage")

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	raw := decodeResponse(t, w)

	expectedKeys := []string{"movies", "tv-shows", "games", "albums", "books"}
	for _, key := range expectedKeys {
		if _, ok := raw[key]; !ok {
			t.Errorf("Expected key %q in response", key)
		}
	}

	// Verify movies have enriched data (detail response, not SearchItem)
	moviesCR := decodeContentResult(t, raw["movies"])
	if moviesCR.Error != nil {
		t.Errorf("Expected no error for movies, got %v", *moviesCR.Error)
	}
	if moviesCR.Metadata == nil || moviesCR.Metadata.TotalResults != 100 {
		t.Errorf("Expected movies metadata with 100 total results, got %+v", moviesCR.Metadata)
	}

	// Verify games
	gamesCR := decodeContentResult(t, raw["games"])
	if gamesCR.Error != nil {
		t.Errorf("Expected no error for games, got %v", *gamesCR.Error)
	}

	// Verify albums
	albumsCR := decodeContentResult(t, raw["albums"])
	if albumsCR.Error != nil {
		t.Errorf("Expected no error for albums, got %v", *albumsCR.Error)
	}

	// Verify books
	booksCR := decodeContentResult(t, raw["books"])
	if booksCR.Error != nil {
		t.Errorf("Expected no error for books, got %v", *booksCR.Error)
	}
}

func TestHomepage_EnrichedResults(t *testing.T) {
	video, games, spotify, books := defaultMocks()
	r := setupRouter(video, games, spotify, books)

	w := doRequest(r, "/homepage")

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	// Parse the raw JSON to verify enriched movie data has detail fields
	var resp map[string]json.RawMessage
	json.Unmarshal(w.Body.Bytes(), &resp)

	var movieGroup struct {
		Results []map[string]any `json:"results"`
	}
	json.Unmarshal(resp["movies"], &movieGroup)

	if len(movieGroup.Results) != 1 {
		t.Fatalf("Expected 1 movie result, got %d", len(movieGroup.Results))
	}

	movie := movieGroup.Results[0]
	if movie["id"] != "1" {
		t.Errorf("Expected movie id '1', got %v", movie["id"])
	}
	if movie["title"] != "Popular Movie" {
		t.Errorf("Expected title 'Popular Movie', got %v", movie["title"])
	}
	// Detail fields should be present (enriched via bulk)
	if movie["type"] != "movie" {
		t.Errorf("Expected type 'movie', got %v", movie["type"])
	}
}

func TestHomepage_PartialFailure_TrendingPhase(t *testing.T) {
	video, games, spotify, books := defaultMocks()
	games.trendingErr = fmt.Errorf("IGDB connection refused")

	r := setupRouter(video, games, spotify, books)
	w := doRequest(r, "/homepage")

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	raw := decodeResponse(t, w)

	// Movies should succeed
	moviesCR := decodeContentResult(t, raw["movies"])
	if moviesCR.Error != nil {
		t.Errorf("Expected no error for movies, got %v", *moviesCR.Error)
	}

	// Games should have error from phase 1
	gamesCR := decodeContentResult(t, raw["games"])
	if gamesCR.Error == nil {
		t.Fatal("Expected error for games, got nil")
	}
	if *gamesCR.Error != "IGDB connection refused" {
		t.Errorf("Expected error message 'IGDB connection refused', got %q", *gamesCR.Error)
	}
}

// Note: the games path no longer has a separate "bulk" phase to fail in;
// trending and enrichment are now serviced by a single
// GetTrendingGamesDetail call (PR-5C.1). The trending-phase test above
// already covers the failure surface for the games bucket.

func TestHomepage_AllServicesFail(t *testing.T) {
	video := &mockVideo{
		popularMoviesErr: fmt.Errorf("TMDB down"),
		popularTVErr:     fmt.Errorf("TMDB down"),
	}
	games := &mockGames{trendingErr: fmt.Errorf("IGDB down")}
	spotify := &mockSpotify{trendingErr: fmt.Errorf("Spotify down")}
	books := &mockBooks{trendingErr: fmt.Errorf("OpenLibrary down")}

	r := setupRouter(video, games, spotify, books)
	w := doRequest(r, "/homepage")

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	raw := decodeResponse(t, w)

	for _, key := range []string{"movies", "tv-shows", "games", "albums", "books"} {
		cr := decodeContentResult(t, raw[key])
		if cr.Error == nil {
			t.Errorf("Expected error for %s, got nil", key)
		}
	}
}

func TestHomepage_EmptyTrending(t *testing.T) {
	video := &mockVideo{
		popularMovies: tmdbservice.SearchResult{Page: 1},
		popularTV:     tmdbservice.SearchResult{Page: 1},
	}
	games := &mockGames{}
	spotify := &mockSpotify{trendingResult: spotifyservice.SearchResult{Page: 1}}
	books := &mockBooks{trendingResult: booksservice.SearchResult{Page: 1}}

	r := setupRouter(video, games, spotify, books)
	w := doRequest(r, "/homepage")

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	raw := decodeResponse(t, w)

	for _, key := range []string{"movies", "tv-shows", "games", "albums", "books"} {
		cr := decodeContentResult(t, raw[key])
		if cr.Error != nil {
			t.Errorf("Expected no error for %s, got %v", key, *cr.Error)
		}
	}
}

func TestHomepage_OrderPreserved(t *testing.T) {
	movie1 := &models.Movie{ID: "10", ContentType: "movie", Title: "First"}
	movie2 := &models.Movie{ID: "20", ContentType: "movie", Title: "Second"}
	movie3 := &models.Movie{ID: "30", ContentType: "movie", Title: "Third"}

	video := &mockVideo{
		popularMovies: tmdbservice.SearchResult{
			Page: 1, TotalPages: 1, TotalResults: 3,
			Results: []models.SearchItem{
				{ID: "10", Type: "movie", Title: "First"},
				{ID: "20", Type: "movie", Title: "Second"},
				{ID: "30", Type: "movie", Title: "Third"},
			},
		},
		popularTV: tmdbservice.SearchResult{Page: 1},
		bulkMovies: []tmdbservice.BulkMovieResult{
			{ID: 30, Movie: movie3}, // Return in different order
			{ID: 10, Movie: movie1},
			{ID: 20, Movie: movie2},
		},
		bulkTVShows: []tmdbservice.BulkTVShowResult{},
	}
	games := &mockGames{}
	spotify := &mockSpotify{trendingResult: spotifyservice.SearchResult{Page: 1}}
	books := &mockBooks{trendingResult: booksservice.SearchResult{Page: 1}}

	r := setupRouter(video, games, spotify, books)
	w := doRequest(r, "/homepage")

	var resp map[string]json.RawMessage
	json.Unmarshal(w.Body.Bytes(), &resp)

	var movieGroup struct {
		Results []map[string]any `json:"results"`
	}
	json.Unmarshal(resp["movies"], &movieGroup)

	if len(movieGroup.Results) != 3 {
		t.Fatalf("Expected 3 movies, got %d", len(movieGroup.Results))
	}

	// Order should follow trending order (10, 20, 30), not bulk order (30, 10, 20)
	expectedOrder := []string{"10", "20", "30"}
	for i, expected := range expectedOrder {
		if movieGroup.Results[i]["id"] != expected {
			t.Errorf("Expected movie[%d] id=%s, got %v", i, expected, movieGroup.Results[i]["id"])
		}
	}
}

func TestHomepage_PaginationParams(t *testing.T) {
	video, games, spotify, books := defaultMocks()

	r := setupRouter(video, games, spotify, books)
	w := doRequest(r, "/homepage?page=2&limit=5")

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}
}

func TestHomepage_CountryHeader(t *testing.T) {
	video, games, spotify, books := defaultMocks()

	r := setupRouter(video, games, spotify, books)
	w := doRequestWithCountry(r, "/homepage", "CO")

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}
}

func TestHomepage_BulkPartialEnrichment(t *testing.T) {
	// Movie 1 enriches fine, Movie 2 fails in bulk (nil Movie pointer)
	movie1 := &models.Movie{ID: "1", ContentType: "movie", Title: "Good Movie"}

	video := &mockVideo{
		popularMovies: tmdbservice.SearchResult{
			Page: 1, TotalPages: 1, TotalResults: 2,
			Results: []models.SearchItem{
				{ID: "1", Type: "movie", Title: "Good Movie"},
				{ID: "2", Type: "movie", Title: "Failed Movie"},
			},
		},
		popularTV: tmdbservice.SearchResult{Page: 1},
		bulkMovies: []tmdbservice.BulkMovieResult{
			{ID: 1, Movie: movie1},
			{ID: 2, Error: "not found"}, // Movie is nil
		},
		bulkTVShows: []tmdbservice.BulkTVShowResult{},
	}
	games := &mockGames{}
	spotify := &mockSpotify{trendingResult: spotifyservice.SearchResult{Page: 1}}
	books := &mockBooks{trendingResult: booksservice.SearchResult{Page: 1}}

	r := setupRouter(video, games, spotify, books)
	w := doRequest(r, "/homepage")

	var resp map[string]json.RawMessage
	json.Unmarshal(w.Body.Bytes(), &resp)

	var movieGroup struct {
		Results []map[string]any `json:"results"`
	}
	json.Unmarshal(resp["movies"], &movieGroup)

	// Only movie 1 should be in results (movie 2 failed enrichment, silently dropped)
	if len(movieGroup.Results) != 1 {
		t.Fatalf("Expected 1 movie (failed one dropped), got %d", len(movieGroup.Results))
	}
	if movieGroup.Results[0]["id"] != "1" {
		t.Errorf("Expected movie id '1', got %v", movieGroup.Results[0]["id"])
	}
}
