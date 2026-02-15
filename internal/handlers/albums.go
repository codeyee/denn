package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	spotifyservice "github.com/codeyee/denn-proxy/internal/services/spotify"
)

const maxBulkAlbumIDs = 20

type AlbumHandler struct {
	service *spotifyservice.Service
}

func NewAlbumHandler(service *spotifyservice.Service) *AlbumHandler {
	return &AlbumHandler{service: service}
}

func (h *AlbumHandler) Search(c *gin.Context) {
	query := c.Query("query")

	if query == "" {
		respondError(c, http.StatusBadRequest, CodeMissingParameter, "query parameter is required")
		return
	}

	page, limit := parsePagination(c)

	result, err := h.service.SearchAlbums(c.Request.Context(), query, page, limit)

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

func (h *AlbumHandler) Detail(c *gin.Context) {
	albumID := c.Param("id")

	if albumID == "" {
		respondError(c, http.StatusBadRequest, CodeMissingParameter, "album ID is required")
		return
	}

	album, err := h.service.GetAlbumComplete(c.Request.Context(), albumID)

	if err != nil {
		handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, album.ToResponse())
}

func (h *AlbumHandler) Bulk(c *gin.Context) {
	idsParam := c.Query("ids")

	if idsParam == "" {
		respondError(c, http.StatusBadRequest, CodeMissingParameter, "ids parameter is required")
		return
	}

	ids := parseStringIDs(idsParam)

	if len(ids) == 0 {
		respondError(c, http.StatusBadRequest, CodeMissingParameter, "at least one id is required")
		return
	}

	if len(ids) > maxBulkAlbumIDs {
		respondError(c, http.StatusBadRequest, CodeLimitExceeded, fmt.Sprintf("maximum %d ids allowed per request", maxBulkAlbumIDs))
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

func (h *AlbumHandler) Trending(c *gin.Context) {
	page, limit := parsePagination(c)

	result, err := h.service.GetTrendingAlbums(c.Request.Context(), page, limit)

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
