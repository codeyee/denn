package clients

import (
	"errors"
	"fmt"
)

var (
	ErrTimeout    = errors.New("request timed out")
	ErrConnection = errors.New("connection failed")
	ErrNotJSON    = errors.New("response is not valid JSON")
	ErrNotFound   = errors.New("resource not found")
)

type APIError struct {
	StatusCode int
	Message    string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("API error (status %d): %s", e.StatusCode, e.Message)
}
