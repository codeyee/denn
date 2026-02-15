package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb"
)

const defaultImagesSize = 10

type MovieHandler struct {
	service *tmdbservice.Service
}

func NewMovieHandler(service *tmdbservice.Service) *MovieHandler {
	return &MovieHandler{service: service}
}

func (h *MovieHandler) Search(c *gin.Context) {
	query := c.Query("query")

	if query == "" {
		respondBadRequest(c, "Query parameter is required")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))

	if page < 1 {
		page = 1
	}

	result, err := h.service.SearchMovies(c.Request.Context(), query, page)

	if err != nil {
		respondInternalError(c, "Failed to search movies")
		return
	}

	c.JSON(http.StatusOK, PaginatedResponse{
		Meta: PaginationMeta{
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
		respondBadRequest(c, "invalid movie ID")
		return
	}

	country := c.DefaultQuery("country", "US")

	imagesSize := defaultImagesSize

	if v := c.Query("images_size"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			imagesSize = parsed
		}
	}

	movie, err := h.service.GetMovieComplete(c.Request.Context(), id, country)

	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			respondNotFound(c, "movie not found")
			return
		}

		respondInternalError(c, "failed to get movie details")
		return
	}

	c.JSON(http.StatusOK, movie.ToResponse(imagesSize))
}

func (h *MovieHandler) Bulk(c *gin.Context) {
	idsParam := c.Query("ids")

	if idsParam == "" {
		respondBadRequest(c, "ids parameter is required")
		return
	}

	ids, err := parseIDs(idsParam)

	if err != nil {
		respondBadRequest(c, "Invalid ids format, expected comma-separated integers")
		return
	}

	if len(ids) == 0 {
		respondBadRequest(c, "At least one id is required")
		return
	}

	country := c.DefaultQuery("country", "US")

	imagesSize := defaultImagesSize

	if v := c.Query("images_size"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			imagesSize = parsed
		}
	}

	results := h.service.GetBulkMovies(c.Request.Context(), ids, country)

	response := make([]any, 0, len(results))
	for _, r := range results {
		if r.Movie != nil {
			response = append(response, r.Movie.ToResponse(imagesSize))
		}
	}

	c.JSON(http.StatusOK, response)
}

func parseIDs(s string) ([]int, error) {
	parts := strings.Split(s, ",")
	ids := make([]int, 0, len(parts))

	for _, p := range parts {
		p = strings.TrimSpace(p)

		if p == "" {
			continue
		}

		id, err := strconv.Atoi(p)

		if err != nil {
			return nil, err
		}

		ids = append(ids, id)
	}

	return ids, nil
}