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
	"strconv"
	"strings"
	"time"
)

const (
	defaultTimeout        = 30 * time.Second
	defaultMaxRetries     = 5
	defaultInitialBackoff = 500 * time.Millisecond
	defaultMaxBackoff     = 10 * time.Second
)

type Response struct {
	Data       json.RawMessage
	StatusCode int
}

// RetryConfig controls how Request handles transient upstream failures.
// Zero values mean "retry once with no backoff" (i.e. effectively disabled);
// callers should use the explicit constructors instead of building a zero
// struct by hand.
type RetryConfig struct {
	MaxRetries     int
	InitialBackoff time.Duration
	MaxBackoff     time.Duration
	// TotalBudget bounds the cumulative time spent across all attempts.
	// When zero the parent context is the only deadline.
	TotalBudget time.Duration
}

func defaultRetryConfig() RetryConfig {
	return RetryConfig{
		MaxRetries:     defaultMaxRetries,
		InitialBackoff: defaultInitialBackoff,
		MaxBackoff:     defaultMaxBackoff,
	}
}

type BaseClient struct {
	baseURL    string
	apiName    string
	httpClient *http.Client
	headersFn  func() map[string]string
	retry      RetryConfig
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

// WithRetryConfig overrides the default retry policy. Pass MaxRetries: 0 in
// tests that want a 5xx/429 response to surface immediately instead of
// triggering the full backoff loop.
func WithRetryConfig(cfg RetryConfig) ClientOption {
	return func(c *BaseClient) {
		c.retry = cfg
	}
}

// WithNoRetry is shorthand for WithRetryConfig with retries disabled.
// Intended for unit tests that exercise error-path handling.
func WithNoRetry() ClientOption {
	return WithRetryConfig(RetryConfig{MaxRetries: 0})
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
		retry:      defaultRetryConfig(),
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

	// Optional total budget: cap cumulative time across all attempts. Zero
	// means "rely on the parent context only", which is the production
	// default for backwards compatibility.
	if c.retry.TotalBudget > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, c.retry.TotalBudget)
		defer cancel()
	}

	var (
		err             error
		lastClassified  error // ErrRateLimit | ErrServerError | ErrConnection
		lastRetryAfter  time.Duration
		nextBackoff     = c.retry.InitialBackoff
		maxBO           = c.retry.MaxBackoff
	)

	for attempt := 0; attempt <= c.retry.MaxRetries; attempt++ {
		if attempt > 0 {
			// Prefer the upstream's Retry-After hint; otherwise full-jitter
			// backoff (uniform[0, nextBackoff)) to break herd behavior during
			// fan-out fan-in scenarios like /homepage.
			wait := lastRetryAfter
			if wait <= 0 && nextBackoff > 0 {
				wait = time.Duration(rand.Int63n(int64(nextBackoff)))
			}
			lastRetryAfter = 0

			if wait > 0 {
				timer := time.NewTimer(wait)
				select {
				case <-ctx.Done():
					timer.Stop()
					return nil, classifyContextErr(ctx.Err())
				case <-timer.C:
				}
			}

			if nextBackoff > 0 {
				nextBackoff = min(nextBackoff*2, maxBO)
			}
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

		var resp *http.Response
		resp, err = c.httpClient.Do(req)

		if err != nil {
			if ctx.Err() != nil {
				return nil, classifyContextErr(ctx.Err())
			}
			lastClassified = ErrConnection
			continue
		}

		rawBody, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()

		if readErr != nil {
			err = fmt.Errorf("%w: failed to read response body: %w", ErrConnection, readErr)
			lastClassified = ErrConnection
			continue
		}

		// 429 and 5xx are the only retryable status classes. 4xx other than
		// 429 surfaces immediately so callers can short-circuit.
		if resp.StatusCode == http.StatusTooManyRequests {
			lastClassified = ErrRateLimit
			lastRetryAfter = parseRetryAfter(resp.Header.Get("Retry-After"), maxBO)
			continue
		}
		if resp.StatusCode >= 500 && resp.StatusCode < 600 {
			lastClassified = ErrServerError
			lastRetryAfter = parseRetryAfter(resp.Header.Get("Retry-After"), maxBO)
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

	// Retries exhausted. Classify so callers (services, handlers) can
	// distinguish "we gave up after 6 tries with rate limits" from "the
	// upstream blew up once". errors.Is(err, ErrUpstreamExhausted) and
	// errors.Is(err, ErrRateLimit) both succeed against this wrapped value.
	switch {
	case lastClassified != nil:
		if err != nil {
			return nil, fmt.Errorf("%w: %w: %w", ErrUpstreamExhausted, lastClassified, err)
		}
		return nil, fmt.Errorf("%w: %w", ErrUpstreamExhausted, lastClassified)
	case err != nil:
		var urlErr *url.Error
		if errors.As(err, &urlErr) && urlErr.Timeout() {
			return nil, fmt.Errorf("%w: %w", ErrTimeout, err)
		}
		return nil, fmt.Errorf("%w: %w: %w", ErrUpstreamExhausted, ErrConnection, err)
	default:
		return nil, fmt.Errorf("%w: %w", ErrUpstreamExhausted, ErrConnection)
	}
}

// classifyContextErr maps a context error onto our taxonomy. Both
// DeadlineExceeded and Canceled are surfaced as ErrTimeout because callers
// generally want the same handling (502/504 with a visible reason) regardless
// of which side cancelled.
func classifyContextErr(err error) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("%w: %w", ErrTimeout, err)
}

// parseRetryAfter parses the value of an HTTP Retry-After header. Per RFC 7231
// the value is either a delta in seconds or an HTTP-date. We ignore values
// above maxBackoff to avoid pathological waits when an upstream returns a
// huge number; tests rely on the cap.
func parseRetryAfter(value string, maxBackoff time.Duration) time.Duration {
	if value == "" {
		return 0
	}
	if secs, err := strconv.Atoi(strings.TrimSpace(value)); err == nil && secs >= 0 {
		d := time.Duration(secs) * time.Second
		if maxBackoff > 0 && d > maxBackoff {
			return maxBackoff
		}
		return d
	}
	if t, err := http.ParseTime(value); err == nil {
		d := time.Until(t)
		if d <= 0 {
			return 0
		}
		if maxBackoff > 0 && d > maxBackoff {
			return maxBackoff
		}
		return d
	}
	return 0
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
