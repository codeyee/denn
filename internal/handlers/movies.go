package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/clients"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb"
)

const maxBulkIDs = 50

type MovieHandler struct {
	service *tmdbservice.Service
}

func NewMovieHandler(service *tmdbservice.Service) *MovieHandler {
	return &MovieHandler{service: service}
}

func (h *MovieHandler) Search(c *gin.Context) {
	query := c.Query("query")

	if query == "" {
		respondError(c, http.StatusBadRequest, CodeMissingParameter, "query parameter is required")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))

	if page < 1 {
		page = 1
	}

	result, err := h.service.SearchMovies(c.Request.Context(), query, page)

	if err != nil {
		respondError(c, http.StatusInternalServerError, CodeInternalError, "failed to search movies")
		return
	}

	c.JSON(http.StatusOK, PaginatedResponse{
		Metadata: PaginationMetadata{
			Page:         result.Page,
			TotalPages:   result.TotalPages,
			TotalResults: result.TotalResults,
		},
		Results: result.Results,
	})
}

func (h *MovieHandler) Trending(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))

	if page < 1 {
		page = 1
	}

	result, err := h.service.GetPopularMovies(c.Request.Context(), page)

	if err != nil {
		respondError(c, http.StatusInternalServerError, CodeInternalError, "failed to get trending movies")
		return
	}

	c.JSON(http.StatusOK, PaginatedResponse{
		Metadata: PaginationMetadata{
			Page:         result.Page,
			TotalPages:   result.TotalPages,
			TotalResults: result.TotalResults,
		},
		Results: result.Results,
	})
}

func (h *MovieHandler) Detail(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))

	if err != nil {
		respondError(c, http.StatusBadRequest, CodeInvalidParameter, "invalid movie ID")
		return
	}

	country := c.DefaultQuery("country", "US")
	imagesSize := parseImagesSize(c)

	movie, err := h.service.GetMovieComplete(c.Request.Context(), id, country)

	if err != nil {
		if errors.Is(err, clients.ErrNotFound) {
			respondError(c, http.StatusNotFound, CodeNotFound, "movie not found")
			return
		}

		respondError(c, http.StatusInternalServerError, CodeInternalError, "failed to get movie details")
		return
	}

	c.JSON(http.StatusOK, movie.ToResponse(imagesSize))
}

func (h *MovieHandler) Bulk(c *gin.Context) {
	idsParam := c.Query("ids")

	if idsParam == "" {
		respondError(c, http.StatusBadRequest, CodeMissingParameter, "ids parameter is required")
		return
	}

	ids, err := parseIDs(idsParam)

	if err != nil {
		respondError(c, http.StatusBadRequest, CodeInvalidParameter, "invalid ids format, expected comma-separated integers")
		return
	}

	if len(ids) == 0 {
		respondError(c, http.StatusBadRequest, CodeMissingParameter, "at least one id is required")
		return
	}

	if len(ids) > maxBulkIDs {
		respondError(c, http.StatusBadRequest, CodeLimitExceeded, fmt.Sprintf("maximum %d ids allowed per request", maxBulkIDs))
		return
	}

	country := c.DefaultQuery("country", "US")
	imagesSize := parseImagesSize(c)

	results := h.service.GetBulkMovies(c.Request.Context(), ids, country)

	response := make([]any, 0, len(results))
	for _, r := range results {
		if r.Movie != nil {
			response = append(response, r.Movie.ToResponse(imagesSize))
		}
	}

	c.JSON(http.StatusOK, response)
}

