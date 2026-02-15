package handlers

import "github.com/gin-gonic/gin"

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
