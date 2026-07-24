package homepage

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/handlers/common"
	"github.com/codeyee/denn-proxy/internal/logging"
	"github.com/codeyee/denn-proxy/internal/models"

	booksservice "github.com/codeyee/denn-proxy/internal/services/books/service"
	spotifyservice "github.com/codeyee/denn-proxy/internal/services/spotify/service"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb/service"
)

// HomepageCacheTTL is short on purpose: homepage is heavily aggregated and a
// few minutes of staleness across users is preferable to thundering five
// upstreams every request. Keep it well under TMDB/IGDB list refresh cycles.
const HomepageCacheTTL = 5 * time.Minute
const HomepageStaleTTL = 30 * time.Minute
const homepageTotalBudget = 2500 * time.Millisecond

// bucketTimeout caps how long a single content bucket (movies, tv-shows,
// games, albums, books) is allowed to block the aggregate response. Without
// it, one slow upstream blocks all five; the homepage then waits up to
// httpclient.maxBackoff*retries before giving up, locking handler goroutines
// and starving the rate limiter.
const bucketTimeout = 1100 * time.Millisecond

type VideoService interface {
	GetPopularMovies(ctx context.Context, page, limit int) (tmdbservice.SearchResult, error)
	GetPopularTVShows(ctx context.Context, page, limit int) (tmdbservice.SearchResult, error)
	// Previews drop the watch-providers and images appends that detail
	// pages need but homepage cards do not. See PR-5C.2 — using
	// GetBulkMovies on /homepage roughly quadrupled TMDB payload and put
	// us at risk of hitting the per-IP rate limit.
	GetBulkMoviePreviews(ctx context.Context, ids []int, country string) []tmdbservice.BulkMovieResult
	GetBulkTVShowPreviews(ctx context.Context, ids []int, country string) []tmdbservice.BulkTVShowResult
}

type GamesService interface {
	// GetTrendingGamesDetail returns the trending page already mapped to
	// full Game models. Homepage uses this in place of
	// GetTrendingGames + GetBulkGames to avoid a duplicate IGDB call: the
	// scoring step inside the service already had to fetch full details,
	// so re-issuing GetBulkGames here was wasted IGDB budget.
	GetTrendingGamesDetail(ctx context.Context, limit, offset int) ([]models.Game, error)
}

type SpotifyService interface {
	GetTrendingAlbums(ctx context.Context, page, limit int) (spotifyservice.SearchResult, error)
	GetBulkAlbums(ctx context.Context, albumIDs []string) []spotifyservice.BulkAlbumResult
}

type BooksService interface {
	GetTrendingBooks(ctx context.Context, page, limit int) (booksservice.SearchResult, error)
	GetBulkBooks(ctx context.Context, bookIDs []string) []booksservice.BulkBookResult
}

type Handler struct {
	videoSvc   VideoService
	gamesSvc   GamesService
	spotifySvc SpotifyService
	booksSvc   BooksService
	cache      clients.Cache
	flightMu   sync.Mutex
	flights    map[string]*homepageFlight
}

type homepageFlight struct {
	done    chan struct{}
	payload []byte
	err     error
}

// NewHandler wires the aggregate handler. The cache is required (pass
// clients.NoOpCache{} when running without Redis); a nil cache would hide
// the fail-open behavior we want to make visible per PR-5D.2.
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
		flights:    make(map[string]*homepageFlight),
	}
}

type ContentResult struct {
	Metadata *common.PaginationMetadata `json:"metadata"`
	Results  any                        `json:"results"`
	Error    *string                    `json:"error"`
}

// HomepageContentResult is used only for Swagger documentation.
// At runtime Results contains full detail objects (MovieResponse, GameResponse, etc.).
type HomepageContentResult struct {
	Metadata *common.PaginationMetadata `json:"metadata"`
	Results  []any                      `json:"results"`
	Error    *string                    `json:"error"`
}

// HomepageResponse is used only for Swagger documentation.
// At runtime the handler returns map[string]ContentResult with dynamic keys.
type HomepageResponse struct {
	Movies  HomepageContentResult `json:"movies"`
	TVShows HomepageContentResult `json:"tv-shows"`
	Games   HomepageContentResult `json:"games"`
	Albums  HomepageContentResult `json:"albums"`
	Books   HomepageContentResult `json:"books"`
}

type trendingData struct {
	items    []models.SearchItem
	metadata *common.PaginationMetadata
	err      error
	// prefetched lets a trending fetcher hand a fully-detailed payload to
	// the enrichment phase so we skip the second bulk call. Currently used
	// by the games bucket; nil for everything else.
	prefetched any
}

const (
	keyMovies  = "movies"
	keyTVShows = "tv-shows"
	keyGames   = "games"
	keyAlbums  = "albums"
	keyBooks   = "books"
)

var allKeys = []string{keyMovies, keyTVShows, keyGames, keyAlbums, keyBooks}

// Homepage godoc
// @Summary      Homepage — trending content with full detail enrichment
// @Description  Two-phase parallel fan-out: (1) fetch trending/popular from all 5 services, (2) enrich with full detail objects. Returns MovieResponse, TVShowResponse, GameResponse, AlbumResponse, BookResponse objects preserving trending order. Country is read from the X-User-Country header.
// @Tags         Aggregate
// @Produce      json
// @Param        page            query    int     false  "Page number (min 1)"        default(1)   minimum(1)
// @Param        limit           query    int     false  "Results per page (max 50)"  default(20)  minimum(1)  maximum(50)
// @Param        X-User-Country  header   string  false  "ISO 3166-1 alpha-2 country code for platform availability (default US)"
// @Success      200  {object}  homepage.HomepageResponse
// @Failure      401  {object}  map[string]string
// @Failure      429  {object}  common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /homepage [get]
func (h *Handler) Homepage(c *gin.Context) {
	page, limit := common.ParsePagination(c)
	country := common.GetCountryFromHeader(c)
	ctx := c.Request.Context()

	cacheKey := homepageCacheKey(page, limit, country)
	if cached, err := h.cache.Get(ctx, cacheKey); err == nil && len(cached) > 0 {
		c.Header("X-Cache", "HIT")
		c.Data(http.StatusOK, "application/json", cached)
		return
	}
	staleKey := homepageStaleCacheKey(page, limit, country)
	if stale, err := h.cache.Get(ctx, staleKey); err == nil && len(stale) > 0 {
		c.Header("X-Cache", "STALE")
		c.Data(http.StatusOK, "application/json", stale)
		go func() {
			started := time.Now()
			logging.L().Info(
				"homepage_refresh",
				"cache_key", cacheKey,
				"state", "started",
			)
			refreshCtx, cancel := context.WithTimeout(context.Background(), homepageTotalBudget)
			defer cancel()
			_, refreshErr := h.singleflight(refreshCtx, cacheKey, func() ([]byte, error) {
				return h.computeAndCache(refreshCtx, page, limit, country)
			})
			logging.L().Info(
				"homepage_refresh",
				"cache_key", cacheKey,
				"state", "completed",
				"success", refreshErr == nil,
				"duration_ms", time.Since(started).Milliseconds(),
			)
		}()
		return
	}

	computeCtx, cancel := context.WithTimeout(ctx, homepageTotalBudget)
	defer cancel()
	payload, err := h.singleflight(computeCtx, cacheKey, func() ([]byte, error) {
		return h.computeAndCache(computeCtx, page, limit, country)
	})
	if err != nil {
		c.Header("X-Cache", "MISS")
		c.JSON(http.StatusOK, homepageTimeoutResponse(err))
		return
	}
	c.Header("X-Cache", "MISS")
	c.Data(http.StatusOK, "application/json", payload)
}

func (h *Handler) computeAndCache(
	ctx context.Context,
	page, limit int,
	country string,
) ([]byte, error) {
	trending := h.fetchTrending(ctx, page, limit)
	results := h.enrichAll(ctx, trending, country)
	payload, err := json.Marshal(results)
	if err != nil {
		return nil, err
	}

	cacheCtx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond)
	defer cancel()
	cacheKey := homepageCacheKey(page, limit, country)
	if cacheErr := h.cache.Set(cacheCtx, cacheKey, payload, HomepageCacheTTL); cacheErr != nil {
		logging.L().Warn(
			"homepage_cache_set_failed",
			"cache_key", cacheKey,
			"cache_tier", "fresh",
			"error", cacheErr,
		)
	}
	if cacheErr := h.cache.Set(
		cacheCtx,
		homepageStaleCacheKey(page, limit, country),
		payload,
		HomepageStaleTTL,
	); cacheErr != nil {
		logging.L().Warn(
			"homepage_cache_set_failed",
			"cache_key", cacheKey,
			"cache_tier", "stale",
			"error", cacheErr,
		)
	}
	return payload, nil
}

func (h *Handler) singleflight(
	ctx context.Context,
	key string,
	fn func() ([]byte, error),
) ([]byte, error) {
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
	call := &homepageFlight{done: make(chan struct{})}
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

func homepageTimeoutResponse(err error) map[string]ContentResult {
	message := "homepage aggregate budget exhausted"
	if err != nil {
		message = err.Error()
	}
	response := make(map[string]ContentResult, len(allKeys))
	for _, key := range allKeys {
		response[key] = errorResult(message)
	}
	return response
}

// bucketContext derives a per-bucket child context with a hard deadline so
// no single upstream can hold the homepage hostage. Returning cancel keeps
// the goroutine leak detector happy when the bucket finishes early.
func bucketContext(parent context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(parent, bucketTimeout)
}

// homepageCacheKey scopes the aggregate by the inputs that change the
// payload. Country must be in the key because the (now-leaner) preview
// payloads still contain country-specific provider hints in some buckets.
func homepageCacheKey(page, limit int, country string) string {
	if country == "" {
		country = "US"
	}
	return fmt.Sprintf(
		"homepage:v3:adult-exclude:future-24h:p%d:l%d:c%s",
		page,
		limit,
		country,
	)
}

func homepageStaleCacheKey(page, limit int, country string) string {
	return homepageCacheKey(page, limit, country) + ":stale"
}

func (h *Handler) fetchTrending(ctx context.Context, page, limit int) map[string]trendingData {
	results := make(map[string]trendingData, len(allKeys))
	slots := make([]trendingData, len(allKeys))

	var wg sync.WaitGroup
	wg.Add(len(allKeys))

	offset := (page - 1) * limit

	go func() {
		defer wg.Done()
		bctx, cancel := bucketContext(ctx)
		defer cancel()
		res, err := h.videoSvc.GetPopularMovies(bctx, page, limit)
		slots[0] = trendingData{
			items:    res.Results,
			metadata: paginationFromTMDB(res),
			err:      err,
		}
	}()

	go func() {
		defer wg.Done()
		bctx, cancel := bucketContext(ctx)
		defer cancel()
		res, err := h.videoSvc.GetPopularTVShows(bctx, page, limit)
		slots[1] = trendingData{
			items:    res.Results,
			metadata: paginationFromTMDB(res),
			err:      err,
		}
	}()

	go func() {
		defer wg.Done()
		bctx, cancel := bucketContext(ctx)
		defer cancel()
		// Single IGDB roundtrip for both the trending list and the
		// enriched detail payload — the service already had to fetch
		// full Game models to compute the trending score.
		games, err := h.gamesSvc.GetTrendingGamesDetail(bctx, limit, offset)
		items := make([]models.SearchItem, 0, len(games))
		for _, g := range games {
			items = append(items, models.SearchItem{
				ID:          g.ID,
				Type:        g.ContentType,
				Title:       g.Title,
				Description: g.Description,
				ImageURL:    g.ImageURL,
				ReleaseDate: g.ReleaseDate,
				Authors:     g.Authors,
			})
		}
		slots[2] = trendingData{
			items: items,
			metadata: &common.PaginationMetadata{
				Page:         page,
				TotalResults: len(items),
			},
			err:        err,
			prefetched: games,
		}
	}()

	go func() {
		defer wg.Done()
		bctx, cancel := bucketContext(ctx)
		defer cancel()
		res, err := h.spotifySvc.GetTrendingAlbums(bctx, page, limit)
		slots[3] = trendingData{
			items: res.Results,
			metadata: &common.PaginationMetadata{
				Page:         res.Page,
				TotalPages:   res.TotalPages,
				TotalResults: res.TotalResults,
			},
			err: err,
		}
	}()

	go func() {
		defer wg.Done()
		bctx, cancel := bucketContext(ctx)
		defer cancel()
		res, err := h.booksSvc.GetTrendingBooks(bctx, page, limit)
		slots[4] = trendingData{
			items: res.Results,
			metadata: &common.PaginationMetadata{
				Page:         res.Page,
				TotalPages:   res.TotalPages,
				TotalResults: res.TotalResults,
			},
			err: err,
		}
	}()

	wg.Wait()

	for i, key := range allKeys {
		results[key] = slots[i]
	}

	return results
}

func (h *Handler) enrichAll(ctx context.Context, trending map[string]trendingData, country string) map[string]ContentResult {
	response := make(map[string]ContentResult, len(allKeys))

	type enrichResult struct {
		key    string
		result ContentResult
	}

	var wg sync.WaitGroup
	ch := make(chan enrichResult, len(allKeys))

	for _, key := range allKeys {
		td := trending[key]

		if td.err != nil {
			msg := td.err.Error()
			response[key] = ContentResult{Metadata: nil, Results: []any{}, Error: &msg}
			continue
		}

		if len(td.items) == 0 {
			response[key] = ContentResult{Metadata: td.metadata, Results: []any{}, Error: nil}
			continue
		}

		wg.Add(1)
		go func(k string, data trendingData) {
			defer wg.Done()
			bctx, cancel := bucketContext(ctx)
			defer cancel()
			ch <- enrichResult{key: k, result: h.enrichOne(bctx, k, data, country)}
		}(key, td)
	}

	go func() {
		wg.Wait()
		close(ch)
	}()

	for er := range ch {
		response[er.key] = er.result
	}

	return response
}

func (h *Handler) enrichOne(ctx context.Context, key string, td trendingData, country string) ContentResult {
	switch key {

	case keyMovies:
		return h.enrichMovies(ctx, td, country)

	case keyTVShows:
		return h.enrichTVShows(ctx, td, country)

	case keyGames:
		return h.enrichGames(ctx, td)

	case keyAlbums:
		return h.enrichAlbums(ctx, td)

	case keyBooks:
		return h.enrichBooks(ctx, td)

	default:
		return errorResult("unsupported content type")
	}
}

func (h *Handler) enrichMovies(ctx context.Context, td trendingData, country string) ContentResult {
	ids := extractIntIDs(td.items)
	if len(ids) == 0 {
		return successResult([]any{}, td.metadata)
	}

	bulkResults := h.videoSvc.GetBulkMoviePreviews(ctx, ids, country)

	// Build an ID→response map for order preservation.
	detailMap := make(map[string]models.MovieResponse, len(bulkResults))
	for _, br := range bulkResults {
		if br.Movie != nil {
			detailMap[br.Movie.ID] = br.Movie.ToResponse()
		}
	}

	return buildOrderedResult(td, detailMap)
}

func (h *Handler) enrichTVShows(ctx context.Context, td trendingData, country string) ContentResult {
	ids := extractIntIDs(td.items)
	if len(ids) == 0 {
		return successResult([]any{}, td.metadata)
	}

	bulkResults := h.videoSvc.GetBulkTVShowPreviews(ctx, ids, country)

	detailMap := make(map[string]models.TVShowResponse, len(bulkResults))
	for _, br := range bulkResults {
		if br.TVShow != nil {
			detailMap[br.TVShow.ID] = br.TVShow.ToResponse()
		}
	}

	return buildOrderedResult(td, detailMap)
}

func (h *Handler) enrichGames(_ context.Context, td trendingData) ContentResult {
	if len(td.items) == 0 {
		return successResult([]any{}, td.metadata)
	}

	// trending phase already fetched full models; just shape them.
	games, _ := td.prefetched.([]models.Game)
	detailMap := make(map[string]models.GameResponse, len(games))
	for _, g := range games {
		detailMap[g.ID] = g.ToResponse()
	}
	return buildOrderedResult(td, detailMap)
}

func (h *Handler) enrichAlbums(ctx context.Context, td trendingData) ContentResult {
	ids := extractStringIDs(td.items)
	if len(ids) == 0 {
		return successResult([]any{}, td.metadata)
	}

	bulkResults := h.spotifySvc.GetBulkAlbums(ctx, ids)

	detailMap := make(map[string]models.AlbumResponse, len(bulkResults))
	var firstErr string
	for _, br := range bulkResults {
		if br.Album != nil {
			detailMap[br.Album.ID] = br.Album.ToResponse()
		} else if br.Error != "" && firstErr == "" {
			firstErr = br.Error
		}
	}

	if len(detailMap) == 0 && firstErr != "" {
		return errorResult(firstErr)
	}

	return buildOrderedResult(td, detailMap)
}

func (h *Handler) enrichBooks(ctx context.Context, td trendingData) ContentResult {
	ids := extractStringIDs(td.items)
	if len(ids) == 0 {
		return successResult([]any{}, td.metadata)
	}

	bulkResults := h.booksSvc.GetBulkBooks(ctx, ids)

	detailMap := make(map[string]models.BookResponse, len(bulkResults))
	for _, br := range bulkResults {
		if br.Book != nil {
			detailMap[br.Book.ID] = br.Book.ToResponse()
		}
	}

	return buildOrderedResult(td, detailMap)
}

func buildOrderedResult[T any](td trendingData, detailMap map[string]T) ContentResult {
	results := make([]T, 0, len(td.items))
	for _, item := range td.items {
		if detail, ok := detailMap[item.ID]; ok {
			results = append(results, detail)
		}
	}
	return successResult(results, td.metadata)
}

func successResult(items any, meta *common.PaginationMetadata) ContentResult {
	return ContentResult{Metadata: meta, Results: items, Error: nil}
}

func errorResult(msg string) ContentResult {
	return ContentResult{Metadata: nil, Results: []any{}, Error: &msg}
}

func paginationFromTMDB(res tmdbservice.SearchResult) *common.PaginationMetadata {
	return &common.PaginationMetadata{
		Page:         res.Page,
		TotalPages:   res.TotalPages,
		TotalResults: res.TotalResults,
	}
}

func extractIntIDs(items []models.SearchItem) []int {
	ids := make([]int, 0, len(items))
	for _, item := range items {
		if id, err := strconv.Atoi(item.ID); err == nil {
			ids = append(ids, id)
		}
	}
	return ids
}

func extractStringIDs(items []models.SearchItem) []string {
	ids := make([]string, 0, len(items))
	for _, item := range items {
		if item.ID != "" {
			ids = append(ids, item.ID)
		}
	}
	return ids
}
