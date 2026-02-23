package tvshows

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/handlers/common"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb/service"
)

const maxBulkIDs = 50

type Handler struct {
	service *tmdbservice.Service
}

func NewHandler(service *tmdbservice.Service) *Handler {
	return &Handler{service: service}
}

// Search godoc
// @Summary      Search TV shows
// @Tags         TV Shows
// @Produce      json
// @Param        query  query    string  true   "Search term"
// @Param        page   query    int     false  "Page number (min 1)"          default(1)   minimum(1)
// @Param        limit  query    int     false  "Results per page (max 50)"    default(20)  minimum(1)  maximum(50)
// @Success      200    {object} common.PaginatedSearchResponse
// @Failure      400    {object} common.ErrorResponse
// @Failure      401    {object} map[string]string
// @Failure      429    {object} common.ErrorResponse
// @Failure      502    {object} common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /tv_shows/search [get]
func (h *Handler) Search(c *gin.Context) {
	query := c.Query("query")

	if query == "" {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "query parameter is required")
		return
	}

	page, limit := common.ParsePagination(c)

	result, err := h.service.SearchTVShows(c.Request.Context(), query, page, limit)

	if err != nil {
		common.HandleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, common.PaginatedResponse{
		Metadata: common.PaginationMetadata{
			Page:         result.Page,
			TotalPages:   result.TotalPages,
			TotalResults: result.TotalResults,
		},
		Results: result.Results,
	})
}

// Trending godoc
// @Summary      Get popular/trending TV shows
// @Tags         TV Shows
// @Produce      json
// @Param        page   query    int  false  "Page number (min 1)"        default(1)   minimum(1)
// @Param        limit  query    int  false  "Results per page (max 50)"  default(20)  minimum(1)  maximum(50)
// @Success      200    {object} common.PaginatedSearchResponse
// @Failure      401    {object} map[string]string
// @Failure      429    {object} common.ErrorResponse
// @Failure      502    {object} common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /tv_shows/trending [get]
func (h *Handler) Trending(c *gin.Context) {
	page, limit := common.ParsePagination(c)

	result, err := h.service.GetPopularTVShows(c.Request.Context(), page, limit)

	if err != nil {
		common.HandleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, common.PaginatedResponse{
		Metadata: common.PaginationMetadata{
			Page:         result.Page,
			TotalPages:   result.TotalPages,
			TotalResults: result.TotalResults,
		},
		Results: result.Results,
	})
}

// Detail godoc
// @Summary      Get TV show details
// @Tags         TV Shows
// @Produce      json
// @Param        id              path     int     true   "TMDB TV show ID"
// @Param        X-User-Country  header   string  false  "ISO 3166-1 alpha-2 country code for platform availability (default US)"
// @Success      200  {object}  models.TVShowResponse
// @Failure      400  {object}  common.ErrorResponse
// @Failure      401  {object}  map[string]string
// @Failure      404  {object}  common.ErrorResponse
// @Failure      429  {object}  common.ErrorResponse
// @Failure      502  {object}  common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /tv_shows/{id} [get]
func (h *Handler) Detail(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))

	if err != nil {
		common.RespondError(c, http.StatusBadRequest, common.CodeInvalidParameter, "invalid tv show ID")
		return
	}

	country := common.GetCountryFromHeader(c)

	show, err := h.service.GetTVShowComplete(c.Request.Context(), id, country)

	if err != nil {
		common.HandleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, show.ToResponse())
}

// SeasonDetail godoc
// @Summary      Get season details with episodes
// @Tags         TV Shows
// @Produce      json
// @Param        id              path     int     true   "TMDB TV show ID"
// @Param        season_number   path     int     true   "Season number (1-based)"
// @Param        X-User-Country  header   string  false  "ISO 3166-1 alpha-2 country code for platform availability (default US)"
// @Success      200  {object}  models.SeasonResponse
// @Failure      400  {object}  common.ErrorResponse
// @Failure      401  {object}  map[string]string
// @Failure      404  {object}  common.ErrorResponse
// @Failure      429  {object}  common.ErrorResponse
// @Failure      502  {object}  common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /tv_shows/{id}/seasons/{season_number} [get]
func (h *Handler) SeasonDetail(c *gin.Context) {
	tvID, err := strconv.Atoi(c.Param("id"))

	if err != nil {
		common.RespondError(c, http.StatusBadRequest, common.CodeInvalidParameter, "invalid tv show ID")
		return
	}

	seasonNumber, err := strconv.Atoi(c.Param("season_number"))

	if err != nil {
		common.RespondError(c, http.StatusBadRequest, common.CodeInvalidParameter, "invalid season number")
		return
	}

	country := common.GetCountryFromHeader(c)

	season, err := h.service.GetSeasonComplete(c.Request.Context(), tvID, seasonNumber, country)

	if err != nil {
		common.HandleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, season.ToResponse())
}

// Bulk godoc
// @Summary      Get multiple TV shows by ID
// @Description  Fetches full details for up to 50 TV shows in parallel. Failed IDs are silently omitted.
// @Tags         TV Shows
// @Produce      json
// @Param        ids             query    string  true   "Comma-separated TMDB TV show IDs (max 50)"  example(1396,66732)
// @Param        X-User-Country  header   string  false  "ISO 3166-1 alpha-2 country code for platform availability (default US)"
// @Success      200  {array}   models.TVShowResponse
// @Failure      400  {object}  common.ErrorResponse
// @Failure      401  {object}  map[string]string
// @Failure      429  {object}  common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /tv_shows/bulk [get]
func (h *Handler) Bulk(c *gin.Context) {
	idsParam := c.Query("ids")

	if idsParam == "" {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "ids parameter is required")
		return
	}

	ids, err := common.ParseIDs(idsParam)

	if err != nil {
		common.RespondError(c, http.StatusBadRequest, common.CodeInvalidParameter, "invalid ids format, expected comma-separated integers")
		return
	}

	if len(ids) == 0 {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "at least one id is required")
		return
	}

	if len(ids) > maxBulkIDs {
		common.RespondError(c, http.StatusBadRequest, common.CodeLimitExceeded, fmt.Sprintf("maximum %d ids allowed per request", maxBulkIDs))
		return
	}

	country := common.GetCountryFromHeader(c)

	results := h.service.GetBulkTVShows(c.Request.Context(), ids, country)

	response := make([]any, 0, len(results))

	for _, r := range results {
		if r.TVShow != nil {
			response = append(response, r.TVShow.ToResponse())
		}
	}

	c.JSON(http.StatusOK, response)
}
