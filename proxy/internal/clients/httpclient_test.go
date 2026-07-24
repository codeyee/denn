package clients

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"sync/atomic"
	"testing"
	"time"

	"github.com/codeyee/denn-proxy/internal/testutil"
)

func TestRequest_ExhaustedRateLimitClassified(t *testing.T) {
	var calls int32
	rt := testutil.RoundTripFunc(func(*http.Request) (*http.Response, error) {
		atomic.AddInt32(&calls, 1)
		return testutil.JSONResponse(http.StatusTooManyRequests, map[string]string{"error": "slow down"}), nil
	})

	c := NewBaseClient("http://example.test",
		WithHTTPClient(testutil.HTTPClient(rt)),
		WithRetryConfig(RetryConfig{MaxRetries: 2, InitialBackoff: time.Millisecond, MaxBackoff: 5 * time.Millisecond}),
	)

	_, err := c.Request(context.Background(), http.MethodGet, "/x", nil, nil)
	if err == nil {
		t.Fatal("expected error after exhausted retries")
	}
	if !errors.Is(err, ErrUpstreamExhausted) {
		t.Errorf("expected ErrUpstreamExhausted, got %v", err)
	}
	if !errors.Is(err, ErrRateLimit) {
		t.Errorf("expected wrapped ErrRateLimit, got %v", err)
	}
	if got := atomic.LoadInt32(&calls); got != 3 {
		t.Errorf("expected 3 attempts (1 + 2 retries), got %d", got)
	}
}

func TestRequest_HonorsRetryAfter(t *testing.T) {
	var calls int32
	var firstAt, secondAt time.Time
	rt := testutil.RoundTripFunc(func(*http.Request) (*http.Response, error) {
		n := atomic.AddInt32(&calls, 1)
		switch n {
		case 1:
			firstAt = time.Now()
			resp := testutil.JSONResponse(http.StatusTooManyRequests, map[string]string{"error": "slow"})
			resp.Header.Set("Retry-After", strconv.Itoa(1))
			return resp, nil
		default:
			secondAt = time.Now()
			return testutil.JSONResponse(http.StatusOK, map[string]string{"ok": "true"}), nil
		}
	})

	c := NewBaseClient("http://example.test",
		WithHTTPClient(testutil.HTTPClient(rt)),
		// Retry-After: 1s should beat the 1ms full-jitter backoff. Cap the
		// MaxBackoff at 2s so the 1s wait isn't silently truncated.
		WithRetryConfig(RetryConfig{MaxRetries: 2, InitialBackoff: time.Millisecond, MaxBackoff: 2 * time.Second}),
	)

	resp, err := c.Request(context.Background(), http.MethodGet, "/x", nil, nil)
	if err != nil {
		t.Fatalf("expected success on retry, got %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	if calls != 2 {
		t.Errorf("expected 2 attempts, got %d", calls)
	}
	if waited := secondAt.Sub(firstAt); waited < 900*time.Millisecond {
		t.Errorf("expected at least ~1s wait honoring Retry-After, got %v", waited)
	}
}

func TestRequest_NoRetryOn4xx(t *testing.T) {
	var calls int32
	rt := testutil.RoundTripFunc(func(*http.Request) (*http.Response, error) {
		atomic.AddInt32(&calls, 1)
		return testutil.JSONResponse(http.StatusBadRequest, map[string]string{"error": "bad"}), nil
	})

	c := NewBaseClient("http://example.test",
		WithHTTPClient(testutil.HTTPClient(rt)),
		WithRetryConfig(RetryConfig{MaxRetries: 5, InitialBackoff: time.Millisecond, MaxBackoff: 5 * time.Millisecond}),
	)

	resp, err := c.Request(context.Background(), http.MethodGet, "/x", nil, nil)
	if err != nil {
		t.Fatalf("4xx should surface the response, got error %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
	if calls != 1 {
		t.Errorf("expected single attempt for 4xx, got %d", calls)
	}
}

func TestRequest_TotalBudgetCutsLoopShort(t *testing.T) {
	rt := testutil.RoundTripFunc(func(*http.Request) (*http.Response, error) {
		return testutil.JSONResponse(http.StatusInternalServerError, map[string]string{"error": "boom"}), nil
	})

	c := NewBaseClient("http://example.test",
		WithHTTPClient(testutil.HTTPClient(rt)),
		WithRetryConfig(RetryConfig{
			MaxRetries:     20,
			InitialBackoff: 50 * time.Millisecond,
			MaxBackoff:     200 * time.Millisecond,
			TotalBudget:    100 * time.Millisecond,
		}),
	)

	start := time.Now()
	_, err := c.Request(context.Background(), http.MethodGet, "/x", nil, nil)
	elapsed := time.Since(start)
	if err == nil {
		t.Fatal("expected error when budget elapses")
	}
	if elapsed > 500*time.Millisecond {
		t.Errorf("budget should have stopped retries quickly, took %v", elapsed)
	}
	if !errors.Is(err, ErrTimeout) && !errors.Is(err, ErrUpstreamExhausted) {
		t.Errorf("expected timeout or exhausted classification, got %v", err)
	}
}

func TestRequest_CircuitOpensAfterConsecutiveTransientFailures(t *testing.T) {
	var calls int32
	rt := testutil.RoundTripFunc(func(*http.Request) (*http.Response, error) {
		atomic.AddInt32(&calls, 1)
		return testutil.JSONResponse(
			http.StatusInternalServerError,
			map[string]string{"error": "boom"},
		), nil
	})
	client := NewBaseClient(
		"http://example.test",
		WithAPIName("test-provider"),
		WithHTTPClient(testutil.HTTPClient(rt)),
		WithNoRetry(),
	)

	for range circuitThreshold {
		if _, err := client.Get(context.Background(), "/x", nil); err == nil {
			t.Fatal("expected transient provider failure")
		}
	}
	if _, err := client.Get(context.Background(), "/x", nil); !errors.Is(err, ErrCircuitOpen) {
		t.Fatalf("expected open circuit, got %v", err)
	}
	if got := atomic.LoadInt32(&calls); got != circuitThreshold {
		t.Fatalf("open circuit should fail before transport, got %d calls", got)
	}
}
