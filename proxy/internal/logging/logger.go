// Package logging owns the process-wide structured logger.
//
// We standardize on log/slog (stdlib, Go ≥1.21) with a JSON handler so
// every line is grep-able and shippable to Loki/Datadog/etc. without a
// parsing layer. See docs/observability.md.
package logging

import (
	"log/slog"
	"os"
	"strings"
	"sync"
)

var (
	once   sync.Once
	logger *slog.Logger
)

// L returns the process logger. Cheap to call from any goroutine.
func L() *slog.Logger {
	once.Do(func() {
		level := parseLevel(os.Getenv("LOG_LEVEL"))
		handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: level,
		})
		logger = slog.New(handler)
	})
	return logger
}

// SetDefault installs the package logger as slog.Default() so libraries
// that call slog.* directly also emit JSON.
func SetDefault() {
	slog.SetDefault(L())
}

func parseLevel(v string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
