package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	gamesservice "github.com/codeyee/denn-proxy/internal/services/games"
)

type GamesHandler struct {
	service *gamesservice.Service
}

func NewGamesHandler(service *gamesservice.Service) *GamesHandler {
	return &GamesHandler{service: service}
}

func (h *GamesHandler) Search(c *gin.Context) {
	query := c.Query("query")

	if query == "" {
		respondError(c, http.StatusBadRequest, CodeMissingParameter, "query parameter is required")
		return
	}

	page, limit := parsePagination(c)
	
	offset := (page - 1) * limit

	result, err := h.service.SearchGames(c.Request.Context(), query, limit, offset)

	if err != nil {
		fmt.Printf("SearchGames Error: %v\n", err)
		handleServiceError(c, err)
		return
	}
	
	c.JSON(http.StatusOK, PaginatedResponse{
		Metadata: PaginationMetadata{
			Page:         page,
			TotalPages:   0,
			TotalResults: 0,
		},
		Results: result.Results,
	})
}

func (h *GamesHandler) Detail(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))

	if err != nil {
		respondError(c, http.StatusBadRequest, CodeInvalidParameter, "invalid game ID")
		return
	}

	game, err := h.service.GetGameComplete(c.Request.Context(), id)
	if err != nil {
		handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, game.ToResponse())
}

func (h *GamesHandler) Bulk(c *gin.Context) {
	idsParam := c.Query("ids")

	if idsParam == "" {
		respondError(c, http.StatusBadRequest, CodeMissingParameter, "ids parameter is required")
		return
	}

	ids, err := parseIDs(idsParam)

	if err != nil {
		respondError(c, http.StatusBadRequest, CodeInvalidParameter, "invalid ids format")
		return
	}

	if len(ids) == 0 {
		respondError(c, http.StatusBadRequest, CodeMissingParameter, "at least one id is required")
		return
	}

	if len(ids) > maxBulkIDs {
		respondError(c, http.StatusBadRequest, CodeLimitExceeded, fmt.Sprintf("maximum %d ids allowed", maxBulkIDs))
		return
	}

	games, err := h.service.GetBulkGames(c.Request.Context(), ids)

	if err != nil {
		handleServiceError(c, err)
		return
	}

	response := make([]any, 0, len(games))

	for _, g := range games {
		response = append(response, g.ToResponse())
	}

	c.JSON(http.StatusOK, response)
}

func (h *GamesHandler) Trending(c *gin.Context) {
	page, limit := parsePagination(c)
	
	offset := (page - 1) * limit
	
	results, err := h.service.GetTrendingGames(c.Request.Context(), limit, offset)

	if err != nil {
		handleServiceError(c, err)
		return
	}
	
	c.JSON(http.StatusOK, PaginatedResponse{
		Metadata: PaginationMetadata{
			Page: page,
			TotalPages: 0,
			TotalResults: 0,
		},
		Results: results,
	})
}
