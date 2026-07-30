package browse

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/handlers/common"
	"github.com/codeyee/denn-proxy/internal/models"
	booksservice "github.com/codeyee/denn-proxy/internal/services/books/service"
	gamesservice "github.com/codeyee/denn-proxy/internal/services/games/service"
	spotifyservice "github.com/codeyee/denn-proxy/internal/services/spotify/service"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb/service"
	"github.com/codeyee/denn-proxy/internal/testutil"
)

type mockVideo struct {
	popular tmdbservice.SearchResult
	recent  tmdbservice.SearchResult
	search  tmdbservice.SearchResult
	err     error
	adult   bool
}

func (m *mockVideo) SearchMoviesWithAdult(_ context.Context, _ string, _, _ int, adult bool) (tmdbservice.SearchResult, error) {
	m.adult = adult
	return m.search, m.err
}
func (m *mockVideo) SearchTVShowsWithAdult(_ context.Context, _ string, _, _ int, adult bool) (tmdbservice.SearchResult, error) {
	m.adult = adult
	return m.search, m.err
}
func (m *mockVideo) GetPopularMovies(context.Context, int, int) (tmdbservice.SearchResult, error) {
	return m.popular, m.err
}
func (m *mockVideo) GetPopularTVShows(context.Context, int, int) (tmdbservice.SearchResult, error) {
	return m.popular, m.err
}
func (m *mockVideo) GetRecentMovies(context.Context, int, int) (tmdbservice.SearchResult, error) {
	return m.recent, m.err
}
func (m *mockVideo) GetRecentTVShows(context.Context, int, int) (tmdbservice.SearchResult, error) {
	return m.recent, m.err
}

type mockGames struct {
	items  []models.SearchItem
	result gamesservice.SearchResult
	err    error
}

func (m *mockGames) SearchGames(context.Context, string, int, int) (gamesservice.SearchResult, error) {
	return m.result, m.err
}
func (m *mockGames) GetPopularGames(context.Context, int, int) ([]models.SearchItem, error) {
	return m.items, m.err
}
func (m *mockGames) GetRecentGames(context.Context, int, int) ([]models.SearchItem, error) {
	return m.items, m.err
}

type mockSpotify struct {
	result spotifyservice.SearchResult
	err    error
}

func (m *mockSpotify) SearchAlbums(context.Context, string, int, int) (spotifyservice.SearchResult, error) {
	return m.result, m.err
}
func (m *mockSpotify) GetTrendingAlbums(context.Context, int, int) (spotifyservice.SearchResult, error) {
	return m.result, m.err
}
func (m *mockSpotify) GetRecentAlbums(context.Context, int, int) (spotifyservice.SearchResult, error) {
	return m.result, m.err
}

type mockBooks struct {
	result booksservice.SearchResult
	err    error
}

func (m *mockBooks) SearchBooks(context.Context, string, int, int) (booksservice.SearchResult, error) {
	return m.result, m.err
}
func (m *mockBooks) GetTrendingBooks(context.Context, int, int) (booksservice.SearchResult, error) {
	return m.result, m.err
}
func (m *mockBooks) GetRecentBooks(context.Context, int, int) (booksservice.SearchResult, error) {
	return m.result, m.err
}

func setupRouter(video VideoService, cache clients.Cache) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewHandler(video, &mockGames{}, &mockSpotify{}, &mockBooks{}, cache)
	r.GET("/browse", h.Browse)
	return r
}

func browseRequest(r *gin.Engine, path string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	r.ServeHTTP(w, req)
	return w
}

func TestBrowseReturnsNormalizedPopularResults(t *testing.T) {
	video := &mockVideo{popular: tmdbservice.SearchResult{
		Page: 1, TotalPages: 4, TotalResults: 80,
		Results: []models.SearchItem{{ID: "1", Type: "MOVIE", Title: "Dune"}},
	}}
	response := browseRequest(setupRouter(video, clients.NoOpCache{}), "/browse?type=movies&sort=popular&page=1")

	if response.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.Code)
	}
	var payload BrowseResponse
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Type != "movies" || payload.Mode != "popular" || payload.Status != "complete" {
		t.Fatalf("unexpected payload: %+v", payload)
	}
	if payload.Metadata.TotalResults != 80 || len(payload.Results) != 1 {
		t.Fatalf("unexpected pagination/results: %+v", payload)
	}
}

func TestBrowseSearchAlwaysExcludesAdultContent(t *testing.T) {
	video := &mockVideo{search: tmdbservice.SearchResult{Page: 1}}
	response := browseRequest(setupRouter(video, clients.NoOpCache{}), "/browse?type=movies&q=matrix&sort=recent")

	if response.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.Code)
	}
	var payload BrowseResponse
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Mode != "search" || video.adult {
		t.Fatalf("browse search must use safe adult policy: mode=%s adult=%v", payload.Mode, video.adult)
	}
}

func TestBrowseRejectsInvalidParameters(t *testing.T) {
	r := setupRouter(&mockVideo{}, clients.NoOpCache{})
	for _, path := range []string{
		"/browse?type=people",
		"/browse?type=movies&sort=rating",
		"/browse?type=movies&page=101",
		"/browse?type=movies&q=" + "x" + "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
	} {
		response := browseRequest(r, path)
		if response.Code != http.StatusBadRequest {
			t.Errorf("expected 400 for %s, got %d", path, response.Code)
		}
	}
}

func TestBrowseCachesFreshPayload(t *testing.T) {
	video := &mockVideo{popular: tmdbservice.SearchResult{Page: 1}}
	cache := testutil.NewMemoryCache()
	r := setupRouter(video, cache)
	first := browseRequest(r, "/browse?type=movies")
	second := browseRequest(r, "/browse?type=movies")
	if first.Header().Get("X-Cache") != "MISS" || second.Header().Get("X-Cache") != "HIT" {
		t.Fatalf("unexpected cache headers: first=%q second=%q", first.Header().Get("X-Cache"), second.Header().Get("X-Cache"))
	}
}

func TestBrowseServesStalePayloadAndRefreshes(t *testing.T) {
	video := &mockVideo{err: errors.New("provider down")}
	cache := testutil.NewMemoryCache()
	key := browseCacheKey("movies", "popular", "", 1, "US")
	payload := mustMarshal(BrowseResponse{
		Type: "movies", Mode: "popular", Status: "complete", Results: []models.SearchItem{},
		Metadata: commonPagination(1),
	})
	if err := cache.Set(context.Background(), browseStaleCacheKey(key), payload, time.Minute); err != nil {
		t.Fatal(err)
	}
	response := browseRequest(setupRouter(video, cache), "/browse?type=movies")
	if response.Header().Get("X-Cache") != "STALE" || response.Body.String() != string(payload) {
		t.Fatalf("expected stale payload, cache=%q body=%s", response.Header().Get("X-Cache"), response.Body.String())
	}
}

func commonPagination(page int) common.PaginationMetadata {
	return common.PaginationMetadata{Page: page}
}
