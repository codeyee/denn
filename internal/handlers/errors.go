package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

const (
	CodeMissingParameter = "MISSING_PARAMETER"
	CodeInvalidParameter = "INVALID_PARAMETER"
	CodeLimitExceeded    = "LIMIT_EXCEEDED"
	CodeNotFound         = "NOT_FOUND"
	CodeInternalError    = "INTERNAL_ERROR"
)

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type PaginationMeta struct {
	Page         int `json:"page"`
	TotalPages   int `json:"total_pages"`
	TotalResults int `json:"total_results"`
}

type PaginatedResponse struct {
	Metadata PaginationMeta `json:"metadata"`
	Results  any            `json:"results"`
}

func respondError(c *gin.Context, statusCode int, code, message string) {
	c.JSON(statusCode, ErrorResponse{
		Code:    code,
		Message: message,
	})
}

const defaultImagesSize = 10

func parseImagesSize(c *gin.Context) int {
	if v := c.Query("images_size"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			return parsed
		}
	}

	return defaultImagesSize
}
