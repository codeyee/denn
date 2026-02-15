package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/clients"
	booksservice "github.com/codeyee/denn-proxy/internal/services/books"
)

const maxBulkBookIDs = 20

type BookHandler struct {
	service *booksservice.Service
}

func NewBookHandler(service *booksservice.Service) *BookHandler {
	return &BookHandler{service: service}
}

func (h *BookHandler) Search(c *gin.Context) {
	query := c.Query("query")

	if query == "" {
		respondError(c, http.StatusBadRequest, CodeMissingParameter, "query parameter is required")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))

	if page < 1 {
		page = 1
	}

	result, err := h.service.SearchBooks(c.Request.Context(), query, page)

	if err != nil {
		respondError(c, http.StatusInternalServerError, CodeInternalError, "failed to search books")
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

func (h *BookHandler) Detail(c *gin.Context) {
	bookID := c.Param("id")

	if bookID == "" {
		respondError(c, http.StatusBadRequest, CodeMissingParameter, "book ID is required")
		return
	}

	imagesSize := parseImagesSize(c)

	book, err := h.service.GetBookComplete(c.Request.Context(), bookID)

	if err != nil {
		if errors.Is(err, clients.ErrNotFound) {
			respondError(c, http.StatusNotFound, CodeNotFound, "book not found")
			return
		}

		respondError(c, http.StatusInternalServerError, CodeInternalError, "failed to get book details")
		return
	}

	c.JSON(http.StatusOK, book.ToResponse(imagesSize))
}

func (h *BookHandler) Bulk(c *gin.Context) {
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

	if len(ids) > maxBulkBookIDs {
		respondError(c, http.StatusBadRequest, CodeLimitExceeded, fmt.Sprintf("maximum %d ids allowed per request", maxBulkBookIDs))
		return
	}

	imagesSize := parseImagesSize(c)

	results := h.service.GetBulkBooks(c.Request.Context(), ids)

	response := make([]any, 0, len(results))
	for _, r := range results {
		if r.Book != nil {
			response = append(response, r.Book.ToResponse(imagesSize))
		}
	}

	c.JSON(http.StatusOK, response)
}

func (h *BookHandler) Trending(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))

	if page < 1 {
		page = 1
	}

	result, err := h.service.GetTrendingBooks(c.Request.Context(), page)

	if err != nil {
		respondError(c, http.StatusInternalServerError, CodeInternalError, "failed to get trending books")
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
