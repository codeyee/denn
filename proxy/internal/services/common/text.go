package common

import "strings"

// UniqueTrimmed returns values with surrounding whitespace removed, empty
// entries dropped and duplicates removed, keeping first-seen order. It returns
// nil when nothing remains so callers can rely on omitempty.
func UniqueTrimmed(values []string) []string {
	if len(values) == 0 {
		return nil
	}

	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))

	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, duplicate := seen[value]; duplicate {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}

	if len(out) == 0 {
		return nil
	}

	return out
}
