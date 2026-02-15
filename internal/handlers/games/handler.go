package games

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/handlers/common"
	gamesservice "github.com/codeyee/denn-proxy/internal/services/games"
)

const maxBulkIDs = 50

type Handler struct {
	service *gamesservice.Service
}

func NewHandler(service *gamesservice.Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Search(c *gin.Context) {
	query := c.Query("query")

	if query == "" {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "query parameter is required")
		return
	}

	page, limit := common.ParsePagination(c)
	
	offset := (page - 1) * limit

	result, err := h.service.SearchGames(c.Request.Context(), query, limit, offset)

	if err != nil {
		fmt.Printf("SearchGames Error: %v\n", err)
		common.HandleServiceError(c, err)
		return
	}
	
	c.JSON(http.StatusOK, common.PaginatedResponse{
		Metadata: common.PaginationMetadata{
			Page:         page,
			TotalPages:   0,
			TotalResults: 0,
		},
		Results: result.Results,
	})
}

func (h *Handler) Detail(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))

	if err != nil {
		common.RespondError(c, http.StatusBadRequest, common.CodeInvalidParameter, "invalid game ID")
		return
	}

	game, err := h.service.GetGameComplete(c.Request.Context(), id)
	if err != nil {
		common.HandleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, game.ToResponse())
}

func (h *Handler) Bulk(c *gin.Context) {
	idsParam := c.Query("ids")

	if idsParam == "" {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "ids parameter is required")
		return
	}

	ids, err := common.ParseIDs(idsParam)

	if err != nil {
		common.RespondError(c, http.StatusBadRequest, common.CodeInvalidParameter, "invalid ids format")
		return
	}

	if len(ids) == 0 {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "at least one id is required")
		return
	}

	if len(ids) > maxBulkIDs {
		common.RespondError(c, http.StatusBadRequest, common.CodeLimitExceeded, fmt.Sprintf("maximum %d ids allowed", maxBulkIDs))
		return
	}

	games, err := h.service.GetBulkGames(c.Request.Context(), ids)

	if err != nil {
		common.HandleServiceError(c, err)
		return
	}

	response := make([]any, 0, len(games))

	for _, g := range games {
		response = append(response, g.ToResponse())
	}

	c.JSON(http.StatusOK, response)
}

func (h *Handler) Trending(c *gin.Context) {
	page, limit := common.ParsePagination(c)
	
	offset := (page - 1) * limit
	
	results, err := h.service.GetTrendingGames(c.Request.Context(), limit, offset)

	if err != nil {
		common.HandleServiceError(c, err)
		return
	}
	
	c.JSON(http.StatusOK, common.PaginatedResponse{
		Metadata: common.PaginationMetadata{
			Page: page,
			TotalPages: 0,
			TotalResults: 0,
		},
		Results: results,
	})
}
