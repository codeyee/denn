package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb"
)

type TVShowHandler struct {
	service *tmdbservice.Service
}

func NewTVShowHandler(service *tmdbservice.Service) *TVShowHandler {
	return &TVShowHandler{service: service}
}

func (h *TVShowHandler) Search(c *gin.Context) {
	query := c.Query("query")

	if query == "" {
		respondError(c, http.StatusBadRequest, CodeMissingParameter, "query parameter is required")
		return
	}

	page, limit := parsePagination(c)

	result, err := h.service.SearchTVShows(c.Request.Context(), query, page, limit)

	if err != nil {
		handleServiceError(c, err)
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

func (h *TVShowHandler) Trending(c *gin.Context) {
	page, limit := parsePagination(c)

	result, err := h.service.GetPopularTVShows(c.Request.Context(), page, limit)

	if err != nil {
		handleServiceError(c, err)
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

func (h *TVShowHandler) Detail(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))

	if err != nil {
		respondError(c, http.StatusBadRequest, CodeInvalidParameter, "invalid tv show ID")
		return
	}

	country := getCountryFromHeader(c)

	show, err := h.service.GetTVShowComplete(c.Request.Context(), id, country)

	if err != nil {
		handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, show.ToResponse())
}

func (h *TVShowHandler) SeasonDetail(c *gin.Context) {
	tvID, err := strconv.Atoi(c.Param("id"))

	if err != nil {
		respondError(c, http.StatusBadRequest, CodeInvalidParameter, "invalid tv show ID")
		return
	}

	seasonNumber, err := strconv.Atoi(c.Param("season_number"))

	if err != nil {
		respondError(c, http.StatusBadRequest, CodeInvalidParameter, "invalid season number")
		return
	}

	country := getCountryFromHeader(c)

	season, err := h.service.GetSeasonComplete(c.Request.Context(), tvID, seasonNumber, country)

	if err != nil {
		handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, season.ToResponse())
}

func (h *TVShowHandler) Bulk(c *gin.Context) {
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

	country := getCountryFromHeader(c)

	results := h.service.GetBulkTVShows(c.Request.Context(), ids, country)

	response := make([]any, 0, len(results))

	for _, r := range results {
		if r.TVShow != nil {
			response = append(response, r.TVShow.ToResponse())
		}
	}

	c.JSON(http.StatusOK, response)
}
