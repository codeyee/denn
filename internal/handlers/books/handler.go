package books

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/handlers/common"
	booksservice "github.com/codeyee/denn-proxy/internal/services/books/service"
)

const maxBulkIDs = 20

type Handler struct {
	service *booksservice.Service
}

func NewHandler(service *booksservice.Service) *Handler {
	return &Handler{service: service}
}

// Search godoc
// @Summary      Search books
// @Tags         Books
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
// @Router       /books [get]
func (h *Handler) Search(c *gin.Context) {
	query := c.Query("q")

	if query == "" {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "query parameter is required")
		return
	}

	page, limit := common.ParsePagination(c)

	result, err := h.service.SearchBooks(c.Request.Context(), query, page, limit)

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
// @Summary      Get book details
// @Tags         Books
// @Produce      json
// @Param        id   path     string  true  "OpenLibrary work ID (e.g. OL27448W)"
// @Success      200  {object}  models.BookResponse
// @Failure      400  {object}  common.ErrorResponse
// @Failure      401  {object}  map[string]string
// @Failure      404  {object}  common.ErrorResponse
// @Failure      429  {object}  common.ErrorResponse
// @Failure      502  {object}  common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /books/{id} [get]
func (h *Handler) Detail(c *gin.Context) {
	bookID := c.Param("id")

	if bookID == "" {
		common.RespondError(c, http.StatusBadRequest, common.CodeMissingParameter, "book ID is required")
		return
	}

	book, err := h.service.GetBookComplete(c.Request.Context(), bookID)

	if err != nil {
		common.HandleServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, book.ToResponse())
}

// Bulk godoc
// @Summary      Get multiple books by ID
// @Description  Fetches full details for up to 20 books in parallel. Book IDs are OpenLibrary work IDs (e.g. OL27448W). Failed IDs are silently omitted.
// @Tags         Books
// @Produce      json
// @Param        ids  query    string  true  "Comma-separated OpenLibrary work IDs (max 20)"  example(OL27448W,OL82563W)
// @Success      200  {array}   models.BookResponse
// @Failure      400  {object}  common.ErrorResponse
// @Failure      401  {object}  map[string]string
// @Failure      429  {object}  common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /books/bulk [get]
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

	results := h.service.GetBulkBooks(c.Request.Context(), ids)

	response := make([]any, 0, len(results))
	for _, r := range results {
		if r.Book != nil {
			response = append(response, r.Book.ToResponse())
		}
	}

	c.JSON(http.StatusOK, response)
}

// Trending godoc
// @Summary      Get trending books
// @Description  Sourced from OpenLibrary bestsellers with client-side pagination.
// @Tags         Books
// @Produce      json
// @Param        page   query    int  false  "Page number (min 1)"        default(1)   minimum(1)
// @Param        limit  query    int  false  "Results per page (max 50)"  default(20)  minimum(1)  maximum(50)
// @Success      200    {object} common.PaginatedSearchResponse
// @Failure      401    {object} map[string]string
// @Failure      429    {object} common.ErrorResponse
// @Failure      502    {object} common.ErrorResponse
// @Security     ApiKeyHeader
// @Security     BearerAuth
// @Router       /books/trending [get]
func (h *Handler) Trending(c *gin.Context) {
	page, limit := common.ParsePagination(c)

	result, err := h.service.GetTrendingBooks(c.Request.Context(), page, limit)

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
