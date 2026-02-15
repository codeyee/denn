package common

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	defaultCountry = "US"
	DefaultPage    = 1
	DefaultLimit   = 20
	MaxLimit       = 50
)

func GetCountryFromHeader(c *gin.Context) string {
	if country := c.GetHeader("X-User-Country"); country != "" {
		return country
	}
	return defaultCountry
}

func ParsePagination(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = DefaultPage
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}

	return page, limit
}

func ParseIDs(s string) ([]int, error) {
	parts := strings.Split(s, ",")
	ids := make([]int, 0, len(parts))

	for _, p := range parts {
		p = strings.TrimSpace(p)

		if p == "" {
			continue
		}

		id, err := strconv.Atoi(p)

		if err != nil {
			return nil, err
		}

		ids = append(ids, id)
	}

	return ids, nil
}

func ParseStringIDs(s string) []string {
	parts := strings.Split(s, ",")
	ids := make([]string, 0, len(parts))

	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			ids = append(ids, p)
		}
	}

	return ids
}
