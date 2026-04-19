package common

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

// ErrorResponse is the canonical error envelope shared with `core` and
// consumed by `web`. See .docs/contracts/internal-http.md.
//
//   {
//     "error":   "MACHINE_CODE",
//     "message": "Human readable",
//     "fields":  { "name": ["msg"] },   // optional
//     "request_id": "uuid"              // added by request-id middleware
//   }
type ErrorResponse struct {
	Error     string              `json:"error"`
	Message   string              `json:"message"`
	Fields    map[string][]string `json:"fields,omitempty"`
	RequestID string              `json:"request_id,omitempty"`
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

// RequestIDFromContext extracts the request ID set by the request-id
// middleware. Returns an empty string when the middleware has not run
// (which is the case in many tests).
func RequestIDFromContext(c *gin.Context) string {
	if v, ok := c.Get("request_id"); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func RespondError(c *gin.Context, statusCode int, code, message string) {
	c.JSON(statusCode, ErrorResponse{
		Error:     code,
		Message:   message,
		RequestID: RequestIDFromContext(c),
	})
}

func HandleServiceError(c *gin.Context, err error) {
	if errors.Is(err, clients.ErrNotFound) {
		RespondError(c, http.StatusNotFound, CodeNotFound, "Resource not found")
		return
	}
	if errors.Is(err, clients.ErrRateLimit) {
		RespondError(c, http.StatusTooManyRequests, CodeRateLimit, "Upstream rate limit exceeded")
		return
	}
	if errors.Is(err, clients.ErrProviderAuth) {
		RespondError(c, http.StatusBadGateway, CodeUpstreamError, "Upstream authentication failed")
		return
	}
	if errors.Is(err, clients.ErrServerError) {
		RespondError(c, http.StatusBadGateway, CodeUpstreamError, "Upstream service error")
		return
	}
	if errors.Is(err, clients.ErrTimeout) {
		RespondError(c, http.StatusGatewayTimeout, CodeUpstreamError, "Upstream request timed out")
		return
	}

	RespondError(c, http.StatusInternalServerError, CodeInternalError, "Internal server error")
}
