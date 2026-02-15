package clients

import (
	"errors"
	"fmt"
)

var (
	ErrTimeout    = errors.New("Request timed out")
	ErrConnection = errors.New("Connection failed")
	ErrNotJSON    = errors.New("Response is not valid JSON")
)

type APIError struct {
	StatusCode int
	Message    string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("API error (status %d): %s", e.StatusCode, e.Message)
}