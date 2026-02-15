package handlers

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	defaultCountry = "US"
	defaultPage    = 1
	defaultLimit   = 20
	maxLimit       = 50
)

func getCountryFromHeader(c *gin.Context) string {
	if country := c.GetHeader("X-User-Country"); country != "" {
		return country
	}
	return defaultCountry
}

func parsePagination(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = defaultPage
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 {
		limit = defaultLimit
	}
	if limit > maxLimit {
		limit = maxLimit
	}

	return page, limit
}

func parseIDs(s string) ([]int, error) {
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

func parseStringIDs(s string) []string {
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
