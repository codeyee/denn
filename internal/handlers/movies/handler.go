package movies

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/handlers/common"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb"
)

const maxBulkIDs = 50

type Handler struct {
	service *tmdbservice.Service
}

func NewHandler(service *tmdbservice.Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Search(c *gin.Context) {
	query := c.Query("query")

	if query == "" {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "query parameter is required")
		return
	}

	page, limit := common.ParsePagination(c)

	result, err := h.service.SearchMovies(c.Request.Context(), query, page, limit)

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

func (h *Handler) Trending(c *gin.Context) {
	page, limit := common.ParsePagination(c)

	result, err := h.service.GetPopularMovies(c.Request.Context(), page, limit)

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

func (h *Handler) Detail(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))

	if err != nil {
		common.RespondError(c, http.StatusBadRequest, common.CodeInvalidParameter, "invalid movie ID")
		return
	}

	country := common.GetCountryFromHeader(c)

	movie, err := h.service.GetMovieComplete(c.Request.Context(), id, country)

	if err != nil {
		common.HandleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, movie.ToResponse())
}

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

	results := h.service.GetBulkMovies(c.Request.Context(), ids, country)

	response := make([]any, 0, len(results))
	for _, r := range results {
		if r.Movie != nil {
			response = append(response, r.Movie.ToResponse())
		}
	}

	c.JSON(http.StatusOK, response)
}

