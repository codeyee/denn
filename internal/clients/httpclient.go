package clients

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	defaultTimeout = 30 * time.Second
	maxRetries     = 5
	initialBackoff = 500 * time.Millisecond
	maxBackoff     = 10 * time.Second
)

type Response struct {
	Data       json.RawMessage
	StatusCode int
}

type BaseClient struct {
	baseURL    string
	apiName    string
	httpClient *http.Client
	headersFn  func() map[string]string
}

type ClientOption func(*BaseClient)

func WithTimeout(d time.Duration) ClientOption {
	return func(c *BaseClient) {
		c.httpClient.Timeout = d
	}
}

func WithHeaders(fn func() map[string]string) ClientOption {
	return func(c *BaseClient) {
		c.headersFn = fn
	}
}

func WithAPIName(name string) ClientOption {
	return func(c *BaseClient) {
		c.apiName = name
	}
}

func WithHTTPClient(client *http.Client) ClientOption {
	return func(c *BaseClient) {
		c.httpClient = client
	}
}

func defaultHeaders() map[string]string {
	return map[string]string{
		"Content-Type": "application/json",
		"Accept":       "application/json",
	}
}

func (c *BaseClient) HTTPClient() *http.Client {
	return c.httpClient
}

func NewBaseClient(baseURL string, opts ...ClientOption) *BaseClient {
	c := &BaseClient{
		baseURL:    strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{Timeout: defaultTimeout},
		headersFn:  defaultHeaders,
	}

	for _, opt := range opts {
		opt(c)
	}

	return c
}

func (c *BaseClient) APIName() string {
	return c.apiName
}

func (c *BaseClient) buildURL(endpoint string) string {
	return c.baseURL + "/" + strings.TrimLeft(endpoint, "/")
}

func (c *BaseClient) Request(ctx context.Context, method, endpoint string, params url.Values, body any) (*Response, error) {
	reqURL := c.buildURL(endpoint)

	if len(params) > 0 {
		reqURL += "?" + params.Encode()
	}

	var bodyReader io.Reader
	var bodyBytes []byte

	if body != nil {
		switch v := body.(type) {

		case string:
			bodyBytes = []byte(v)

		case []byte:
			bodyBytes = v

		default:
			jsonBody, err := json.Marshal(body)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal request body: %w", err)
			}
			bodyBytes = jsonBody
		}
		bodyReader = bytes.NewReader(bodyBytes)
	}

	var resp *http.Response
	var err error

	backoff := initialBackoff

	for i := 0; i <= maxRetries; i++ {
		if i > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(backoff):
				// Calculate next backoff with jitter
				jitter := time.Duration(rand.Int63n(int64(backoff) / 2))
				backoff = min(backoff*2+jitter, maxBackoff)
			}
			// Reset body reader for retry
			if bodyBytes != nil {
				bodyReader = bytes.NewReader(bodyBytes)
			}
		}

		req, reqErr := http.NewRequestWithContext(ctx, method, reqURL, bodyReader)
		if reqErr != nil {
			return nil, fmt.Errorf("failed to create request: %w", reqErr)
		}

		for key, value := range c.headersFn() {
			req.Header.Set(key, value)
		}

		resp, err = c.httpClient.Do(req)

		if err != nil {
			if ctx.Err() != nil {
				return nil, fmt.Errorf("%w: %w", ErrTimeout, ctx.Err())
			}
			// Retry on connection errors
			continue
		}

		// Read body immediately to ensure we have the full response
		// If reading fails, we should close body and retry
		rawBody, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()

		if readErr != nil {
			err = fmt.Errorf("%w: failed to read response body: %w", ErrConnection, readErr)
			continue
		}

		// Check for status codes that warrant a retry (429 Too Many Requests, 5xx Server Errors)
		if resp.StatusCode == http.StatusTooManyRequests || (resp.StatusCode >= 500 && resp.StatusCode < 600) {
			continue
		}

		if !json.Valid(rawBody) {
			preview := string(rawBody[:min(200, len(rawBody))])
			return nil, fmt.Errorf("%w: %s", ErrNotJSON, preview)
		}

		return &Response{
			Data:       rawBody,
			StatusCode: resp.StatusCode,
		}, nil
	}

	if err != nil {
		var urlErr *url.Error
		if errors.As(err, &urlErr) && urlErr.Timeout() {
			return nil, fmt.Errorf("%w: %w", ErrTimeout, err)
		}
		return nil, fmt.Errorf("%w: %w", ErrConnection, err)
	}
	
	// Should not be reached if retries are exhausted correctly, but safe fallback
	return nil, fmt.Errorf("%w: max retries exceeded", ErrConnection)
}

func (c *BaseClient) Get(ctx context.Context, endpoint string, params url.Values) (*Response, error) {
	return c.Request(ctx, http.MethodGet, endpoint, params, nil)
}

func (c *BaseClient) Post(ctx context.Context, endpoint string, body any, params url.Values) (*Response, error) {
	return c.Request(ctx, http.MethodPost, endpoint, params, body)
}

func (c *BaseClient) Put(ctx context.Context, endpoint string, body any, params url.Values) (*Response, error) {
	return c.Request(ctx, http.MethodPut, endpoint, params, body)
}

func (c *BaseClient) Delete(ctx context.Context, endpoint string, params url.Values) (*Response, error) {
	return c.Request(ctx, http.MethodDelete, endpoint, params, nil)
}
