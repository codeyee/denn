package handlers

import (
	"strconv"
	"strings"
)

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
