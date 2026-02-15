package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/codeyee/denn-proxy/internal/clients"
)

const (
	CodeMissingParameter = "MISSING_PARAMETER"
	CodeInvalidParameter = "INVALID_PARAMETER"
	CodeLimitExceeded    = "LIMIT_EXCEEDED"
	CodeNotFound         = "NOT_FOUND"
	CodeInternalError    = "INTERNAL_ERROR"
	CodeUpstreamError    = "UPSTREAM_ERROR"
	CodeRateLimit        = "RATE_LIMIT_EXCEEDED"
)

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type PaginationMetadata struct {
	Page         int `json:"page"`
	TotalPages   int `json:"total_pages"`
	TotalResults int `json:"total_results"`
}

type PaginatedResponse struct {
	Metadata PaginationMetadata `json:"metadata"`
	Results  any                `json:"results"`
}

func respondError(c *gin.Context, statusCode int, code, message string) {
	c.JSON(statusCode, ErrorResponse{
		Code:    code,
		Message: message,
	})
}

func handleServiceError(c *gin.Context, err error) {
	if errors.Is(err, clients.ErrNotFound) {
		respondError(c, http.StatusNotFound, CodeNotFound, "Resource not found")
		return
	}
	if errors.Is(err, clients.ErrRateLimit) {
		respondError(c, http.StatusTooManyRequests, CodeRateLimit, "Upstream rate limit exceeded")
		return
	}
	if errors.Is(err, clients.ErrProviderAuth) {
		respondError(c, http.StatusBadGateway, CodeUpstreamError, "Upstream authentication failed")
		return
	}
	if errors.Is(err, clients.ErrServerError) {
		respondError(c, http.StatusBadGateway, CodeUpstreamError, "Upstream service error")
		return
	}
	if errors.Is(err, clients.ErrTimeout) {
		respondError(c, http.StatusGatewayTimeout, CodeUpstreamError, "Upstream request timed out")
		return
	}

	respondError(c, http.StatusInternalServerError, CodeInternalError, "Internal server error")
}
