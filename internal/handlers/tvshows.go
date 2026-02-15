package handlers

import (
	"net/http"
	"strconv"
	"strings"

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
		respondBadRequest(c, "query parameter is required")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))

	if page < 1 {
		page = 1
	}

	result, err := h.service.SearchTVShows(c.Request.Context(), query, page)

	if err != nil {
		respondInternalError(c, "failed to search tv shows")
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

func (h *TVShowHandler) Detail(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))

	if err != nil {
		respondBadRequest(c, "invalid tv show ID")
		return
	}

	country := c.DefaultQuery("country", "US")
	expandSeasons := c.Query("expand") == "seasons"

	imagesSize := defaultImagesSize
	if v := c.Query("images_size"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			imagesSize = parsed
		}
	}

	show, err := h.service.GetTVShowComplete(c.Request.Context(), id, country, expandSeasons)

	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			respondNotFound(c, "tv show not found")
			return
		}

		respondInternalError(c, "failed to get tv show details")
		return
	}

	c.JSON(http.StatusOK, show.ToResponse(imagesSize))
}

func (h *TVShowHandler) SeasonDetail(c *gin.Context) {
	tvID, err := strconv.Atoi(c.Param("id"))

	if err != nil {
		respondBadRequest(c, "invalid tv show ID")
		return
	}

	seasonNumber, err := strconv.Atoi(c.Param("season_number"))

	if err != nil {
		respondBadRequest(c, "invalid season number")
		return
	}

	country := c.DefaultQuery("country", "US")

	imagesSize := defaultImagesSize
	if v := c.Query("images_size"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			imagesSize = parsed
		}
	}

	season, err := h.service.GetSeasonComplete(c.Request.Context(), tvID, seasonNumber, country)

	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			respondNotFound(c, "season not found")
			return
		}

		respondInternalError(c, "failed to get season details")
		return
	}

	c.JSON(http.StatusOK, season.ToResponse(imagesSize))
}

func (h *TVShowHandler) Bulk(c *gin.Context) {
	idsParam := c.Query("ids")

	if idsParam == "" {
		respondBadRequest(c, "ids parameter is required")
		return
	}

	ids, err := parseIDs(idsParam)

	if err != nil {
		respondBadRequest(c, "invalid ids format, expected comma-separated integers")
		return
	}

	if len(ids) == 0 {
		respondBadRequest(c, "at least one id is required")
		return
	}

	country := c.DefaultQuery("country", "US")

	imagesSize := defaultImagesSize

	if v := c.Query("images_size"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			imagesSize = parsed
		}
	}

	results := h.service.GetBulkTVShows(c.Request.Context(), ids, country)

	response := make([]any, 0, len(results))

	for _, r := range results {
		if r.TVShow != nil {
			response = append(response, r.TVShow.ToResponse(imagesSize))
		}
	}

	c.JSON(http.StatusOK, response)
}