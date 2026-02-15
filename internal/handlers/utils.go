package handlers

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

const defaultImagesSize = 10

func parseImagesSize(c *gin.Context) int {
	if v := c.Query("images_size"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			return parsed
		}
	}

	return defaultImagesSize
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
