package common

import "github.com/codeyee/denn-proxy/internal/models"

// PaginatedSearchResponse is used only for Swagger documentation.
// At runtime the handler returns PaginatedResponse with Results typed as any.
type PaginatedSearchResponse struct {
	Metadata PaginationMetadata  `json:"metadata"`
	Results  []models.SearchItem `json:"results"`
}
