// Package testutil provides shared HTTP transport helpers for tests across the
// proxy. Centralizing them keeps test files free of duplicated MockRoundTripper
// types and makes it easy to wire deterministic upstream responses without
// hitting the real network.
package testutil

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// RoundTripFunc is an adapter that lets a plain function satisfy
// http.RoundTripper. Use it for one-off transports inside a single test.
type RoundTripFunc func(*http.Request) (*http.Response, error)

// RoundTrip implements http.RoundTripper.
func (f RoundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

// HostHandler routes requests for a specific upstream host (or host suffix) to
// a RoundTripFunc. Use the empty string to define a catch-all fallback.
type HostHandler struct {
	Host string
	Fn   RoundTripFunc
}

// MultiHost returns an http.RoundTripper that dispatches by URL host. The
// first matching handler wins; an empty Host acts as a fallback. If no
// handler matches the request returns http.StatusBadGateway with an error
// payload, which surfaces routing mistakes early instead of hanging.
func MultiHost(handlers ...HostHandler) http.RoundTripper {
	hs := append([]HostHandler(nil), handlers...)
	return RoundTripFunc(func(req *http.Request) (*http.Response, error) {
		for _, h := range hs {
			if h.Host == "" {
				continue
			}
			if req.URL.Host == h.Host || strings.HasSuffix(req.URL.Host, "."+h.Host) {
				return h.Fn(req)
			}
		}
		for _, h := range hs {
			if h.Host == "" {
				return h.Fn(req)
			}
		}
		body := fmt.Sprintf("testutil.MultiHost: unrouted host %q", req.URL.Host)
		return JSONResponse(http.StatusBadGateway, map[string]string{"error": body}), nil
	})
}

// JSONResponse builds an http.Response with a JSON body. body may be raw bytes,
// a string, or any value that json.Marshal accepts.
func JSONResponse(status int, body any) *http.Response {
	var raw []byte
	switch v := body.(type) {
	case nil:
		raw = []byte("null")
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	case json.RawMessage:
		raw = []byte(v)
	default:
		b, err := json.Marshal(body)
		if err != nil {
			raw = []byte(`{"error":"testutil.JSONResponse: marshal failed"}`)
			break
		}
		raw = b
	}

	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(bytes.NewReader(raw)),
		Header:     http.Header{"Content-Type": []string{"application/json"}},
	}
}

// StaticJSON returns a RoundTripFunc that always answers with the same JSON
// body and status code. Useful for the "happy path" half of a MultiHost setup.
func StaticJSON(status int, body any) RoundTripFunc {
	return func(*http.Request) (*http.Response, error) {
		return JSONResponse(status, body), nil
	}
}

// HTTPClient returns an *http.Client wired to the provided transport. The
// timeout is intentionally small (5s) so tests fail fast instead of stalling
// when a real network call slips through.
func HTTPClient(rt http.RoundTripper) *http.Client {
	return &http.Client{Transport: rt}
}
