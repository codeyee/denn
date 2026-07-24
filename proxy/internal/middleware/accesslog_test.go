package middleware

import "testing"

func TestBoundedConsumer(t *testing.T) {
	tests := map[string]string{
		"web":        "web",
		" CORE ":     "core",
		"attacker":   "unknown",
		"user@email": "unknown",
	}
	for input, want := range tests {
		if got := boundedConsumer(input); got != want {
			t.Fatalf("boundedConsumer(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestBoundedCacheStatus(t *testing.T) {
	tests := map[string]string{
		"hit":       "HIT",
		" MISS ":    "MISS",
		"stale":     "STALE",
		"bypass":    "BYPASS",
		"custom-id": "",
	}
	for input, want := range tests {
		if got := boundedCacheStatus(input); got != want {
			t.Fatalf("boundedCacheStatus(%q) = %q, want %q", input, got, want)
		}
	}
}
