package browse

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/handlers/common"
	"github.com/codeyee/denn-proxy/internal/models"

	booksservice "github.com/codeyee/denn-proxy/internal/services/books/service"
	gamesservice "github.com/codeyee/denn-proxy/internal/services/games/service"
	spotifyservice "github.com/codeyee/denn-proxy/internal/services/spotify/service"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb/service"
)

const (
	PageSize          = 24
	gamesFetchSize    = PageSize + 1
	MaxPage           = 100
	MaxQueryLength    = 80
	BrowseCacheTTL    = 5 * time.Minute
	BrowseStaleTTL    = 30 * time.Minute
	browseTotalBudget = 2500 * time.Millisecond
	browseTimeout     = 1100 * time.Millisecond
	policyVersion     = "v1"
)

type VideoService interface {
	SearchMoviesWithAdult(context.Context, string, int, int, bool) (tmdbservice.SearchResult, error)
	SearchTVShowsWithAdult(context.Context, string, int, int, bool) (tmdbservice.SearchResult, error)
	GetPopularMovies(context.Context, int, int) (tmdbservice.SearchResult, error)
	GetPopularTVShows(context.Context, int, int) (tmdbservice.SearchResult, error)
	GetRecentMovies(context.Context, int, int) (tmdbservice.SearchResult, error)
	GetRecentTVShows(context.Context, int, int) (tmdbservice.SearchResult, error)
}

type GamesService interface {
	SearchGames(context.Context, string, int, int) (gamesservice.SearchResult, error)
	GetPopularGames(context.Context, int, int) ([]models.SearchItem, error)
	GetRecentGames(context.Context, int, int) ([]models.SearchItem, error)
}

type SpotifyService interface {
	SearchAlbums(context.Context, string, int, int) (spotifyservice.SearchResult, error)
	GetTrendingAlbums(context.Context, int, int) (spotifyservice.SearchResult, error)
	GetRecentAlbums(context.Context, int, int) (spotifyservice.SearchResult, error)
}

type BooksService interface {
	SearchBooks(context.Context, string, int, int) (booksservice.SearchResult, error)
	GetTrendingBooks(context.Context, int, int) (booksservice.SearchResult, error)
	GetRecentBooks(context.Context, int, int) (booksservice.SearchResult, error)
}

type Handler struct {
	videoSvc   VideoService
	gamesSvc   GamesService
	spotifySvc SpotifyService
	booksSvc   BooksService
	cache      clients.Cache
	flightMu   sync.Mutex
	flights    map[string]*flight
}

type flight struct {
	done    chan struct{}
	payload []byte
	err     error
}

type BrowseResponse struct {
	Type     string                    `json:"type"`
	Mode     string                    `json:"mode"`
	Status   string                    `json:"status"`
	Results  []models.SearchItem       `json:"results"`
	Metadata common.PaginationMetadata `json:"metadata"`
	Error    *string                   `json:"error"`
}

func NewHandler(
	video VideoService,
	games GamesService,
	spotify SpotifyService,
	books BooksService,
	cache clients.Cache,
) *Handler {
	if cache == nil {
		cache = clients.NoOpCache{}
	}
	return &Handler{
		videoSvc:   video,
		gamesSvc:   games,
		spotifySvc: spotify,
		booksSvc:   books,
		cache:      cache,
		flights:    make(map[string]*flight),
	}
}

// Browse godoc
// @Summary      Public browse by media family
// @Description  Returns normalized, safe-by-default discovery results without per-card detail enrichment.
// @Tags         Aggregate
// @Produce      json
// @Param        type            query    string  true   "Content family: movies,tv-shows,games,albums,books"
// @Param        sort            query    string  false  "Sort mode: popular,recent" default(popular)
// @Param        q               query    string  false  "Optional family search (max 80 characters)"
// @Param        page            query    int     false  "Page number (1-100)" default(1) minimum(1) maximum(100)
// @Success      200             {object}  browse.BrowseResponse
// @Failure      400             {object}  common.ErrorResponse
// @Failure      401             {object}  map[string]string
// @Failure      429             {object}  common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /browse [get]
func (h *Handler) Browse(c *gin.Context) {
	contentType, err := parseType(c.Query("type"))
	if err != nil {
		common.RespondError(c, http.StatusBadRequest, common.CodeInvalidParameter, err.Error())
		return
	}

	sortMode, err := parseSort(c.Query("sort"))
	if err != nil {
		common.RespondError(c, http.StatusBadRequest, common.CodeInvalidParameter, err.Error())
		return
	}

	page, err := parsePage(c.Query("page"))
	if err != nil {
		common.RespondError(c, http.StatusBadRequest, common.CodeInvalidParameter, err.Error())
		return
	}

	query := strings.TrimSpace(c.Query("q"))
	if len([]rune(query)) > MaxQueryLength {
		common.RespondError(c, http.StatusBadRequest, common.CodeLimitExceeded, "q must be 80 characters or fewer")
		return
	}

	country := strings.ToUpper(strings.TrimSpace(common.GetCountryFromHeader(c)))
	if country == "" {
		country = "US"
	}
	mode := sortMode
	if query != "" {
		mode = "search"
	}
	cacheKey := browseCacheKey(contentType, mode, query, page, country)
	ctx := c.Request.Context()

	if cached, cacheErr := h.cache.Get(ctx, cacheKey); cacheErr == nil && len(cached) > 0 {
		c.Header("X-Cache", "HIT")
		c.Header("X-Content-Policy", "adult-exclude")
		c.Data(http.StatusOK, "application/json", cached)
		return
	}

	staleKey := browseStaleCacheKey(cacheKey)
	if stale, cacheErr := h.cache.Get(ctx, staleKey); cacheErr == nil && len(stale) > 0 {
		c.Header("X-Cache", "STALE")
		c.Header("X-Content-Policy", "adult-exclude")
		c.Data(http.StatusOK, "application/json", stale)
		go h.refresh(cacheKey, staleKey, contentType, sortMode, query, page, country)
		return
	}

	computeCtx, cancel := context.WithTimeout(ctx, browseTotalBudget)
	defer cancel()
	payload, computeErr := h.singleflight(computeCtx, cacheKey, func() ([]byte, error) {
		return h.computeAndCache(computeCtx, cacheKey, staleKey, contentType, sortMode, query, page, country)
	})
	if computeErr != nil {
		payload = mustMarshal(BrowseResponse{
			Type:     contentType,
			Mode:     mode,
			Status:   "degraded",
			Results:  []models.SearchItem{},
			Metadata: common.PaginationMetadata{Page: page},
			Error:    stringPtr(browseErrorCode(computeErr)),
		})
	}
	c.Header("X-Cache", "MISS")
	c.Header("X-Content-Policy", "adult-exclude")
	c.Data(http.StatusOK, "application/json", payload)
}

func (h *Handler) computeAndCache(
	ctx context.Context,
	cacheKey, staleKey, contentType, sortMode, query string,
	page int,
	country string,
) ([]byte, error) {
	result, err := h.fetch(ctx, contentType, sortMode, query, page)
	response := BrowseResponse{
		Type:     contentType,
		Mode:     sortMode,
		Results:  result.items,
		Metadata: result.metadata,
		Status:   "complete",
	}
	if query != "" {
		response.Mode = "search"
	}
	if err != nil {
		response.Status = "degraded"
		response.Error = stringPtr(browseErrorCode(err))
	}
	if err == nil && len(result.items) == 0 {
		response.Status = "empty"
	}

	payload, marshalErr := json.Marshal(response)
	if marshalErr != nil {
		return nil, marshalErr
	}
	if err != nil {
		return payload, nil
	}
	cacheCtx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond)
	defer cancel()
	_ = h.cache.Set(cacheCtx, cacheKey, payload, BrowseCacheTTL)
	_ = h.cache.Set(cacheCtx, staleKey, payload, BrowseStaleTTL)
	_ = country
	return payload, nil
}

func (h *Handler) refresh(cacheKey, staleKey, contentType, sortMode, query string, page int, country string) {
	ctx, cancel := context.WithTimeout(context.Background(), browseTotalBudget)
	defer cancel()
	_, _ = h.singleflight(ctx, cacheKey, func() ([]byte, error) {
		return h.computeAndCache(ctx, cacheKey, staleKey, contentType, sortMode, query, page, country)
	})
}

type fetchResult struct {
	items    []models.SearchItem
	metadata common.PaginationMetadata
}

func (h *Handler) fetch(ctx context.Context, contentType, sortMode, query string, page int) (fetchResult, error) {
	bctx, cancel := context.WithTimeout(ctx, browseTimeout)
	defer cancel()

	if query != "" {
		switch contentType {
		case "movies":
			result, err := h.videoSvc.SearchMoviesWithAdult(bctx, query, page, PageSize, false)
			return tmdbResult(result), err
		case "tv-shows":
			result, err := h.videoSvc.SearchTVShowsWithAdult(bctx, query, page, PageSize, false)
			return tmdbResult(result), err
		case "games":
			result, err := h.gamesSvc.SearchGames(bctx, query, gamesFetchSize, (page-1)*PageSize)
			return gamesResult(result.Results, page), err
		case "albums":
			result, err := h.spotifySvc.SearchAlbums(bctx, query, page, PageSize)
			return spotifyResult(result), err
		case "books":
			result, err := h.booksSvc.SearchBooks(bctx, query, page, PageSize)
			return booksResult(result), err
		}
	}

	switch contentType {
	case "movies":
		if sortMode == "recent" {
			result, err := h.videoSvc.GetRecentMovies(bctx, page, PageSize)
			return tmdbResult(result), err
		}
		result, err := h.videoSvc.GetPopularMovies(bctx, page, PageSize)
		return tmdbResult(result), err
	case "tv-shows":
		if sortMode == "recent" {
			result, err := h.videoSvc.GetRecentTVShows(bctx, page, PageSize)
			return tmdbResult(result), err
		}
		result, err := h.videoSvc.GetPopularTVShows(bctx, page, PageSize)
		return tmdbResult(result), err
	case "games":
		offset := (page - 1) * PageSize
		if sortMode == "recent" {
			items, err := h.gamesSvc.GetRecentGames(bctx, gamesFetchSize, offset)
			return gamesResult(items, page), err
		}
		items, err := h.gamesSvc.GetPopularGames(bctx, gamesFetchSize, offset)
		return gamesResult(items, page), err
	case "albums":
		if sortMode == "recent" {
			result, err := h.spotifySvc.GetRecentAlbums(bctx, page, PageSize)
			return spotifyResult(result), err
		}
		result, err := h.spotifySvc.GetTrendingAlbums(bctx, page, PageSize)
		return spotifyResult(result), err
	case "books":
		if sortMode == "recent" {
			result, err := h.booksSvc.GetRecentBooks(bctx, page, PageSize)
			return booksResult(result), err
		}
		result, err := h.booksSvc.GetTrendingBooks(bctx, page, PageSize)
		return booksResult(result), err
	default:
		return fetchResult{}, fmt.Errorf("unsupported browse type: %s", contentType)
	}
}

func tmdbResult(result tmdbservice.SearchResult) fetchResult {
	return fetchResult{
		items: result.Results,
		metadata: common.PaginationMetadata{
			Page:         result.Page,
			TotalPages:   result.TotalPages,
			TotalResults: result.TotalResults,
		},
	}
}

func spotifyResult(result spotifyservice.SearchResult) fetchResult {
	return fetchResult{
		items: result.Results,
		metadata: common.PaginationMetadata{
			Page:         result.Page,
			TotalPages:   result.TotalPages,
			TotalResults: result.TotalResults,
		},
	}
}

func booksResult(result booksservice.SearchResult) fetchResult {
	return fetchResult{
		items: result.Results,
		metadata: common.PaginationMetadata{
			Page:         result.Page,
			TotalPages:   result.TotalPages,
			TotalResults: result.TotalResults,
		},
	}
}

func gamesResult(items []models.SearchItem, page int) fetchResult {
	hasMore := len(items) > PageSize
	if hasMore {
		items = items[:PageSize]
	}
	total := (page-1)*PageSize + len(items)
	totalPages := page
	if len(items) == 0 && page == 1 {
		totalPages = 0
	}
	if hasMore {
		// IGDB does not include a total in this response. Fetching one
		// sentinel item lets the public contract expose a safe next page
		// without pretending to know an exact total.
		total++
		totalPages = page + 1
	}
	return fetchResult{
		items: items,
		metadata: common.PaginationMetadata{
			Page:         page,
			TotalPages:   totalPages,
			TotalResults: total,
		},
	}
}

func (h *Handler) singleflight(ctx context.Context, key string, fn func() ([]byte, error)) ([]byte, error) {
	h.flightMu.Lock()
	if existing := h.flights[key]; existing != nil {
		h.flightMu.Unlock()
		select {
		case <-existing.done:
			return existing.payload, existing.err
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	call := &flight{done: make(chan struct{})}
	h.flights[key] = call
	h.flightMu.Unlock()

	go func() {
		call.payload, call.err = fn()
		close(call.done)
		h.flightMu.Lock()
		delete(h.flights, key)
		h.flightMu.Unlock()
	}()

	select {
	case <-call.done:
		return call.payload, call.err
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func parseType(raw string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "movies", "tv-shows", "games", "albums", "books":
		return strings.ToLower(strings.TrimSpace(raw)), nil
	default:
		return "", fmt.Errorf("invalid type: %s", raw)
	}
}

func parseSort(raw string) (string, error) {
	switch value := strings.ToLower(strings.TrimSpace(raw)); value {
	case "", "popular", "recent":
		if value == "" {
			return "popular", nil
		}
		return value, nil
	default:
		return "", fmt.Errorf("invalid sort: %s", raw)
	}
}

func parsePage(raw string) (int, error) {
	if strings.TrimSpace(raw) == "" {
		return 1, nil
	}
	page, err := strconv.Atoi(raw)
	if err != nil || page < 1 || page > MaxPage {
		return 0, fmt.Errorf("page must be between 1 and %d", MaxPage)
	}
	return page, nil
}

func browseCacheKey(contentType, mode, query string, page int, country string) string {
	hash := sha256.Sum256([]byte(strings.ToLower(strings.TrimSpace(query))))
	return fmt.Sprintf(
		"browse:%s:%s:%s:q%s:p%d:c%s:policy-%s",
		policyVersion,
		contentType,
		mode,
		hex.EncodeToString(hash[:8]),
		page,
		country,
		policyVersion,
	)
}

func browseStaleCacheKey(key string) string { return key + ":stale" }

func browseErrorCode(err error) string {
	switch {
	case errors.Is(err, clients.ErrTimeout), errors.Is(err, context.DeadlineExceeded):
		return "PROVIDER_TIMEOUT"
	case errors.Is(err, clients.ErrRateLimit):
		return "PROVIDER_RATE_LIMIT"
	case errors.Is(err, clients.ErrProviderAuth):
		return "PROVIDER_AUTH_FAILED"
	case errors.Is(err, clients.ErrServerError), errors.Is(err, clients.ErrConnection):
		return "PROVIDER_UNAVAILABLE"
	default:
		return "BROWSE_UNAVAILABLE"
	}
}

func stringPtr(value string) *string { return &value }

func mustMarshal(value BrowseResponse) []byte {
	payload, err := json.Marshal(value)
	if err != nil {
		return []byte(`{"type":"unknown","mode":"popular","status":"degraded","results":[],"metadata":{"page":1,"total_results":0,"total_pages":0},"error":"BROWSE_UNAVAILABLE"}`)
	}
	return payload
}
