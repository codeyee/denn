package multisearch

import (
	"context"
	"net/http"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/handlers/common"
	"github.com/codeyee/denn-proxy/internal/models"

	booksservice "github.com/codeyee/denn-proxy/internal/services/books/service"
	gamesservice "github.com/codeyee/denn-proxy/internal/services/games/service"
	spotifyservice "github.com/codeyee/denn-proxy/internal/services/spotify/service"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb/service"
)

type VideoService interface {
	SearchMovies(ctx context.Context, query string, page, limit int) (tmdbservice.SearchResult, error)
	SearchTVShows(ctx context.Context, query string, page, limit int) (tmdbservice.SearchResult, error)
}

type GamesService interface {
	SearchGames(ctx context.Context, query string, limit, offset int) (gamesservice.SearchResult, error)
}

type SpotifyService interface {
	SearchAlbums(ctx context.Context, query string, page, limit int) (spotifyservice.SearchResult, error)
}

type BooksService interface {
	SearchBooks(ctx context.Context, query string, page, limit int) (booksservice.SearchResult, error)
}

type Handler struct {
	tmdbSvc    VideoService
	gamesSvc   GamesService
	spotifySvc SpotifyService
	booksSvc   BooksService
}

func NewHandler(tmdb VideoService, games GamesService, spotify SpotifyService, books BooksService) *Handler {
	return &Handler{
		tmdbSvc:    tmdb,
		gamesSvc:   games,
		spotifySvc: spotify,
		booksSvc:   books,
	}
}

type contentType string

const (
	typeMovies  contentType = "movies"
	typeTVShows contentType = "tv_shows"
	typeGames   contentType = "games"
	typeAlbums  contentType = "albums"
	typeBooks   contentType = "books"
)

var responseKey = map[contentType]string{
	typeMovies:  "movies",
	typeTVShows: "tv_shows",
	typeGames:   "games",
	typeAlbums:  "music",
	typeBooks:   "books",
}

var allTypes = []contentType{typeMovies, typeTVShows, typeGames, typeAlbums, typeBooks}

type ContentResult struct {
	Metadata *common.PaginationMetadata `json:"metadata"`
	Results  []models.SearchItem        `json:"results"`
	Error    *string                    `json:"error"`
}

func (h *Handler) Search(c *gin.Context) {
	query := c.Query("query")
	if query == "" {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "query parameter is required")
		return
	}

	types, err := parseTypes(c.Query("types"))
	if err != nil {
		common.RespondError(c, http.StatusBadRequest, common.CodeInvalidParameter, err.Error())
		return
	}

	_, limit := common.ParsePagination(c)

	results := h.searchAll(c.Request.Context(), query, limit, types)

	response := make(map[string]ContentResult, len(types))
	for _, t := range types {
		response[responseKey[t]] = results[t]
	}

	c.JSON(http.StatusOK, response)
}

func parseTypes(raw string) ([]contentType, error) {
	if raw == "" {
		return allTypes, nil
	}

	valid := make(map[contentType]bool, len(allTypes))
	for _, t := range allTypes {
		valid[t] = true
	}

	parts := strings.Split(raw, ",")
	types := make([]contentType, 0, len(parts))
	seen := make(map[contentType]bool, len(parts))

	for _, p := range parts {
		t := contentType(strings.TrimSpace(strings.ToLower(p)))
		if !valid[t] {
			return nil, &invalidTypeError{value: string(t)}
		}
		if !seen[t] {
			seen[t] = true
			types = append(types, t)
		}
	}

	return types, nil
}

type invalidTypeError struct {
	value string
}

func (e *invalidTypeError) Error() string {
	names := make([]string, len(allTypes))
	for i, t := range allTypes {
		names[i] = string(t)
	}
	return "invalid content type: " + e.value + ". valid types are: " + strings.Join(names, ", ")
}

func (h *Handler) searchAll(ctx context.Context, query string, limit int, types []contentType) map[contentType]ContentResult {
	results := make(map[contentType]ContentResult, len(types))
	slots := make([]ContentResult, len(types))

	var wg sync.WaitGroup
	wg.Add(len(types))

	for i, t := range types {
		go func(idx int, ct contentType) {
			defer wg.Done()
			slots[idx] = h.searchOne(ctx, ct, query, limit)
		}(i, t)
	}

	wg.Wait()

	for i, t := range types {
		results[t] = slots[i]
	}

	return results
}

func (h *Handler) searchOne(ctx context.Context, ct contentType, query string, limit int) ContentResult {
	switch ct {

	case typeMovies:
		return h.searchMovies(ctx, query, limit)

	case typeTVShows:
		return h.searchTVShows(ctx, query, limit)

	case typeGames:
		return h.searchGames(ctx, query, limit)

	case typeAlbums:
		return h.searchAlbums(ctx, query, limit)

	case typeBooks:
		return h.searchBooks(ctx, query, limit)

	default:
		return errorResult("unsupported content type")
	}
}

func (h *Handler) searchMovies(ctx context.Context, query string, limit int) ContentResult {
	res, err := h.tmdbSvc.SearchMovies(ctx, query, 1, limit)
	if err != nil {
		return errorResult(err.Error())
	}

	return successResult(res.Results, &common.PaginationMetadata{
		Page:         res.Page,
		TotalPages:   res.TotalPages,
		TotalResults: res.TotalResults,
	})
}

func (h *Handler) searchTVShows(ctx context.Context, query string, limit int) ContentResult {
	res, err := h.tmdbSvc.SearchTVShows(ctx, query, 1, limit)
	if err != nil {
		return errorResult(err.Error())
	}

	return successResult(res.Results, &common.PaginationMetadata{
		Page:         res.Page,
		TotalPages:   res.TotalPages,
		TotalResults: res.TotalResults,
	})
}

func (h *Handler) searchGames(ctx context.Context, query string, limit int) ContentResult {
	res, err := h.gamesSvc.SearchGames(ctx, query, limit, 0)
	if err != nil {
		return errorResult(err.Error())
	}

	return successResult(res.Results, &common.PaginationMetadata{
		Page:         1,
		TotalPages:   0,
		TotalResults: 0,
	})
}

func (h *Handler) searchAlbums(ctx context.Context, query string, limit int) ContentResult {
	res, err := h.spotifySvc.SearchAlbums(ctx, query, 1, limit)
	if err != nil {
		return errorResult(err.Error())
	}

	return successResult(res.Results, &common.PaginationMetadata{
		Page:         res.Page,
		TotalPages:   res.TotalPages,
		TotalResults: res.TotalResults,
	})
}

func (h *Handler) searchBooks(ctx context.Context, query string, limit int) ContentResult {
	res, err := h.booksSvc.SearchBooks(ctx, query, 1, limit)
	if err != nil {
		return errorResult(err.Error())
	}

	return successResult(res.Results, &common.PaginationMetadata{
		Page:         res.Page,
		TotalPages:   res.TotalPages,
		TotalResults: res.TotalResults,
	})
}

func successResult(items []models.SearchItem, meta *common.PaginationMetadata) ContentResult {
	if items == nil {
		items = []models.SearchItem{}
	}

	return ContentResult{
		Metadata: meta,
		Results:  items,
		Error:    nil,
	}
}

func errorResult(msg string) ContentResult {
	return ContentResult{
		Metadata: nil,
		Results:  []models.SearchItem{},
		Error:    &msg,
	}
}
