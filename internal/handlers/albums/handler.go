package albums

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/handlers/common"
	spotifyservice "github.com/codeyee/denn-proxy/internal/services/spotify/service"
)

const maxBulkIDs = 20

type Handler struct {
	service *spotifyservice.Service
}

func NewHandler(service *spotifyservice.Service) *Handler {
	return &Handler{service: service}
}

// Search godoc
// @Summary      Search albums
// @Description  Singles are excluded from results (only albums and EPs are returned).
// @Tags         Albums
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
// @Router       /albums/search [get]
func (h *Handler) Search(c *gin.Context) {
	query := c.Query("query")

	if query == "" {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "query parameter is required")
		return
	}

	page, limit := common.ParsePagination(c)

	result, err := h.service.SearchAlbums(c.Request.Context(), query, page, limit)

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
// @Summary      Get album details
// @Tags         Albums
// @Produce      json
// @Param        id   path     string  true  "Spotify album ID"
// @Success      200  {object}  models.AlbumResponse
// @Failure      400  {object}  common.ErrorResponse
// @Failure      401  {object}  map[string]string
// @Failure      404  {object}  common.ErrorResponse
// @Failure      429  {object}  common.ErrorResponse
// @Failure      502  {object}  common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /albums/{id} [get]
func (h *Handler) Detail(c *gin.Context) {
	albumID := c.Param("id")

	if albumID == "" {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "album ID is required")
		return
	}

	album, err := h.service.GetAlbumComplete(c.Request.Context(), albumID)

	if err != nil {
		common.HandleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, album.ToResponse())
}

// Bulk godoc
// @Summary      Get multiple albums by ID
// @Description  Fetches full details for up to 20 albums in parallel. Album IDs are Spotify string IDs. Failed IDs are silently omitted.
// @Tags         Albums
// @Produce      json
// @Param        ids  query    string  true  "Comma-separated Spotify album IDs (max 20)"  example(5K79FLRUCSysQnVESLcTdb,3RQQmkQEvNCY4prGKE6oc5)
// @Success      200  {array}   models.AlbumResponse
// @Failure      400  {object}  common.ErrorResponse
// @Failure      401  {object}  map[string]string
// @Failure      429  {object}  common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /albums/bulk [get]
func (h *Handler) Bulk(c *gin.Context) {
	idsParam := c.Query("ids")

	if idsParam == "" {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "ids parameter is required")
		return
	}

	ids := common.ParseStringIDs(idsParam)

	if len(ids) == 0 {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "at least one id is required")
		return
	}

	if len(ids) > maxBulkIDs {
		common.RespondError(c, http.StatusBadRequest, common.CodeLimitExceeded, fmt.Sprintf("maximum %d ids allowed per request", maxBulkIDs))
		return
	}

	results := h.service.GetBulkAlbums(c.Request.Context(), ids)

	response := make([]any, 0, len(results))
	for _, r := range results {
		if r.Album != nil {
			response = append(response, r.Album.ToResponse())
		}
	}

	c.JSON(http.StatusOK, response)
}

// Trending godoc
// @Summary      Get trending albums
// @Description  Sourced from Spotify Charts.
// @Tags         Albums
// @Produce      json
// @Param        page   query    int  false  "Page number (min 1)"        default(1)   minimum(1)
// @Param        limit  query    int  false  "Results per page (max 50)"  default(20)  minimum(1)  maximum(50)
// @Success      200    {object} common.PaginatedSearchResponse
// @Failure      401    {object} map[string]string
// @Failure      429    {object} common.ErrorResponse
// @Failure      502    {object} common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /albums/trending [get]
func (h *Handler) Trending(c *gin.Context) {
	page, limit := common.ParsePagination(c)

	result, err := h.service.GetTrendingAlbums(c.Request.Context(), page, limit)

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
