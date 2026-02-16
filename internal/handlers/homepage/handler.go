package homepage

import (
	"context"
	"net/http"
	"strconv"
	"sync"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/handlers/common"
	"github.com/codeyee/denn-proxy/internal/models"

	booksservice "github.com/codeyee/denn-proxy/internal/services/books/service"
	spotifyservice "github.com/codeyee/denn-proxy/internal/services/spotify/service"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb/service"
)

type VideoService interface {
	GetPopularMovies(ctx context.Context, page, limit int) (tmdbservice.SearchResult, error)
	GetPopularTVShows(ctx context.Context, page, limit int) (tmdbservice.SearchResult, error)
	GetBulkMovies(ctx context.Context, ids []int, country string) []tmdbservice.BulkMovieResult
	GetBulkTVShows(ctx context.Context, ids []int, country string) []tmdbservice.BulkTVShowResult
}

type GamesService interface {
	GetTrendingGames(ctx context.Context, limit, offset int) ([]models.SearchItem, error)
	GetBulkGames(ctx context.Context, ids []int) ([]models.Game, error)
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
}

func NewHandler(video VideoService, games GamesService, spotify SpotifyService, books BooksService) *Handler {
	return &Handler{
		videoSvc:   video,
		gamesSvc:   games,
		spotifySvc: spotify,
		booksSvc:   books,
	}
}

type ContentResult struct {
	Metadata *common.PaginationMetadata `json:"metadata"`
	Results  any                        `json:"results"`
	Error    *string                    `json:"error"`
}

type trendingData struct {
	items    []models.SearchItem
	metadata *common.PaginationMetadata
	err      error
}

const (
	keyMovies  = "movies"
	keyTVShows = "tv_shows"
	keyGames   = "games"
	keyAlbums  = "albums"
	keyBooks   = "books"
)

var allKeys = []string{keyMovies, keyTVShows, keyGames, keyAlbums, keyBooks}

func (h *Handler) Homepage(c *gin.Context) {
	page, limit := common.ParsePagination(c)
	country := common.GetCountryFromHeader(c)

	trending := h.fetchTrending(c.Request.Context(), page, limit)
	results := h.enrichAll(c.Request.Context(), trending, country)

	c.JSON(http.StatusOK, results)
}

func (h *Handler) fetchTrending(ctx context.Context, page, limit int) map[string]trendingData {
	results := make(map[string]trendingData, len(allKeys))
	slots := make([]trendingData, len(allKeys))

	var wg sync.WaitGroup
	wg.Add(len(allKeys))

	offset := (page - 1) * limit

	go func() {
		defer wg.Done()
		res, err := h.videoSvc.GetPopularMovies(ctx, page, limit)
		slots[0] = trendingData{
			items:    res.Results,
			metadata: paginationFromTMDB(res),
			err:      err,
		}
	}()

	go func() {
		defer wg.Done()
		res, err := h.videoSvc.GetPopularTVShows(ctx, page, limit)
		slots[1] = trendingData{
			items:    res.Results,
			metadata: paginationFromTMDB(res),
			err:      err,
		}
	}()

	go func() {
		defer wg.Done()
		items, err := h.gamesSvc.GetTrendingGames(ctx, limit, offset)
		slots[2] = trendingData{
			items: items,
			metadata: &common.PaginationMetadata{
				Page:         page,
				TotalResults: len(items),
			},
			err: err,
		}
	}()

	go func() {
		defer wg.Done()
		res, err := h.spotifySvc.GetTrendingAlbums(ctx, page, limit)
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
		res, err := h.booksSvc.GetTrendingBooks(ctx, page, limit)
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
			ch <- enrichResult{key: k, result: h.enrichOne(ctx, k, data, country)}
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

	bulkResults := h.videoSvc.GetBulkMovies(ctx, ids, country)

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

	bulkResults := h.videoSvc.GetBulkTVShows(ctx, ids, country)

	detailMap := make(map[string]models.TVShowResponse, len(bulkResults))
	for _, br := range bulkResults {
		if br.TVShow != nil {
			detailMap[br.TVShow.ID] = br.TVShow.ToResponse()
		}
	}

	return buildOrderedResult(td, detailMap)
}

func (h *Handler) enrichGames(ctx context.Context, td trendingData) ContentResult {
	ids := extractIntIDs(td.items)
	if len(ids) == 0 {
		return successResult([]any{}, td.metadata)
	}

	games, err := h.gamesSvc.GetBulkGames(ctx, ids)
	if err != nil {
		return errorResult(err.Error())
	}

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
	for _, br := range bulkResults {
		if br.Album != nil {
			detailMap[br.Album.ID] = br.Album.ToResponse()
		}
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