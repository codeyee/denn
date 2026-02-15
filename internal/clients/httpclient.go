package clients

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const defaultTimeout = 30 * time.Second

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

func defaultHeaders() map[string]string {
	return map[string]string{
		"Content-Type": "application/json",
		"Accept":       "application/json",
	}
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

	if body != nil {
		switch v := body.(type) {

		case string:
			bodyReader = strings.NewReader(v)

		case []byte:
			bodyReader = bytes.NewReader(v)

		default:
			jsonBody, err := json.Marshal(body)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal request body: %w", err)
			}
			bodyReader = bytes.NewReader(jsonBody)
		}
	}

	req, err := http.NewRequestWithContext(ctx, method, reqURL, bodyReader)

	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	for key, value := range c.headersFn() {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClient.Do(req)

	if err != nil {
		if ctx.Err() != nil {
			return nil, fmt.Errorf("%w: %w", ErrTimeout, ctx.Err())
		}

		var urlErr *url.Error

		if errors.As(err, &urlErr) && urlErr.Timeout() {
			return nil, fmt.Errorf("%w: %w", ErrTimeout, err)
		}

		return nil, fmt.Errorf("%w: %w", ErrConnection, err)
	}

	defer resp.Body.Close()

	rawBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("%w: failed to read response body: %w", ErrConnection, err)
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
