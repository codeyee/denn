package games

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/handlers/common"
	gamesservice "github.com/codeyee/denn-proxy/internal/services/games/service"
)

const maxBulkIDs = 50

type Handler struct {
	service *gamesservice.Service
}

func NewHandler(service *gamesservice.Service) *Handler {
	return &Handler{service: service}
}

// Search godoc
// @Summary      Search games
// @Description  Searches via IGDB. Note: total_pages and total_results are always 0 (IGDB limitation).
// @Tags         Games
// @Produce      json
// @Param        q      query    string  true   "Search term"
// @Param        page   query    int     false  "Page number (min 1)"          default(1)   minimum(1)
// @Param        limit  query    int     false  "Results per page (max 50)"    default(20)  minimum(1)  maximum(50)
// @Success      200    {object} common.PaginatedSearchResponse
// @Failure      400    {object} common.ErrorResponse
// @Failure      401    {object} map[string]string
// @Failure      429    {object} common.ErrorResponse
// @Failure      502    {object} common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /games [get]
func (h *Handler) Search(c *gin.Context) {
	query := c.Query("q")

	if query == "" {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "query parameter is required")
		return
	}

	page, limit := common.ParsePagination(c)

	offset := (page - 1) * limit

	result, err := h.service.SearchGames(c.Request.Context(), query, limit, offset)

	if err != nil {
		log.Printf("games: SearchGames %q: %v", query, err)
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

// Detail godoc
// @Summary      Get game details
// @Tags         Games
// @Produce      json
// @Param        id   path     int  true  "IGDB game ID"
// @Success      200  {object}  models.GameResponse
// @Failure      400  {object}  common.ErrorResponse
// @Failure      401  {object}  map[string]string
// @Failure      404  {object}  common.ErrorResponse
// @Failure      429  {object}  common.ErrorResponse
// @Failure      502  {object}  common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /games/{id} [get]
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

// Bulk godoc
// @Summary      Get multiple games by ID
// @Description  Fetches full details for up to 50 games in parallel.
// @Tags         Games
// @Produce      json
// @Param        ids  query    string  true  "Comma-separated IGDB game IDs (max 50)"  example(7346,1020)
// @Success      200  {array}   models.GameResponse
// @Failure      400  {object}  common.ErrorResponse
// @Failure      401  {object}  map[string]string
// @Failure      429  {object}  common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /games/bulk [get]
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

// Trending godoc
// @Summary      Get trending games
// @Description  Custom trending algorithm: 70% want-to-play + 30% visits, with recency multiplier (up to 4x). Browser-only games excluded. total_pages and total_results are always 0.
// @Tags         Games
// @Produce      json
// @Param        page   query    int  false  "Page number (min 1)"        default(1)   minimum(1)
// @Param        limit  query    int  false  "Results per page (max 50)"  default(20)  minimum(1)  maximum(50)
// @Success      200    {object} common.PaginatedSearchResponse
// @Failure      401    {object} map[string]string
// @Failure      429    {object} common.ErrorResponse
// @Failure      502    {object} common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /games/trending [get]
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
			Page:         page,
			TotalPages:   0,
			TotalResults: 0,
		},
		Results: results,
	})
}
