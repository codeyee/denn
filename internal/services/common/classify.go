// Package common collects helpers shared across service packages so we don't
// drift when a new sentinel is added to the clients error taxonomy.
package common

import (
	"fmt"

	"github.com/codeyee/denn-proxy/internal/clients"
)

// ClassifyStatus maps an upstream HTTP status code to the appropriate
// sentinel error from the clients package, prefixed with the provider label
// so logs identify the source. Returns nil for 2xx responses.
//
// The previous implementation duplicated this ladder across the games,
// spotify, books and tmdb services; keeping a single source ensures that
// when we add a new classified sentinel (e.g. ErrUpstreamExhausted variants)
// every service picks it up automatically.
func ClassifyStatus(provider string, status int) error {
	switch {
	case status >= 200 && status < 300:
		return nil
	case status == 404:
		return fmt.Errorf("%s %w", provider, clients.ErrNotFound)
	case status == 429:
		return fmt.Errorf("%s %w", provider, clients.ErrRateLimit)
	case status == 401 || status == 403:
		return fmt.Errorf("%s %w", provider, clients.ErrProviderAuth)
	case status >= 500:
		return fmt.Errorf("%s %w", provider, clients.ErrServerError)
	default:
		// Anything else (e.g. 400, 422) is the caller's fault; surface it
		// with the status code so debugging stays cheap.
		return fmt.Errorf("%s API error (status %d): %w", provider, status, clients.ErrClientRequest)
	}
}
