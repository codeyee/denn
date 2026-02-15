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

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))

	if page < 1 {
		page = 1
	}

	result, err := h.service.SearchTVShows(c.Request.Context(), query, page)

	if err != nil {
		respondError(c, http.StatusInternalServerError, CodeInternalError, "failed to search tv shows")
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

	country := c.DefaultQuery("country", "US")
	expandSeasons := c.Query("expand") == "seasons"
	imagesSize := parseImagesSize(c)

	show, err := h.service.GetTVShowComplete(c.Request.Context(), id, country, expandSeasons)

	if err != nil {
		if errors.Is(err, clients.ErrNotFound) {
			respondError(c, http.StatusNotFound, CodeNotFound, "tv show not found")
			return
		}

		respondError(c, http.StatusInternalServerError, CodeInternalError, "failed to get tv show details")
		return
	}

	c.JSON(http.StatusOK, show.ToResponse(imagesSize))
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

	country := c.DefaultQuery("country", "US")
	imagesSize := parseImagesSize(c)

	season, err := h.service.GetSeasonComplete(c.Request.Context(), tvID, seasonNumber, country)

	if err != nil {
		if errors.Is(err, clients.ErrNotFound) {
			respondError(c, http.StatusNotFound, CodeNotFound, "season not found")
			return
		}

		respondError(c, http.StatusInternalServerError, CodeInternalError, "failed to get season details")
		return
	}

	c.JSON(http.StatusOK, season.ToResponse(imagesSize))
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

	country := c.DefaultQuery("country", "US")
	imagesSize := parseImagesSize(c)

	results := h.service.GetBulkTVShows(c.Request.Context(), ids, country)

	response := make([]any, 0, len(results))

	for _, r := range results {
		if r.TVShow != nil {
			response = append(response, r.TVShow.ToResponse(imagesSize))
		}
	}

	c.JSON(http.StatusOK, response)
}
