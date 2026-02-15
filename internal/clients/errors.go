package clients

import "errors"

var (
	ErrNotFound     = errors.New("resource not found")
	ErrTimeout      = errors.New("request timed out")
	ErrConnection   = errors.New("connection failed")
	ErrNotJSON      = errors.New("response was not JSON")
	ErrRateLimit    = errors.New("rate limit exceeded")
	ErrProviderAuth = errors.New("provider authentication failed")
	ErrServerError  = errors.New("provider server error")
)
