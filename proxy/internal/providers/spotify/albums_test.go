package spotify

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/testutil"
)

type MockRoundTripper struct {
	Response *http.Response
	Err      error
}

func (m *MockRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return m.Response, m.Err
}

type MockCache struct {
	data map[string][]byte
}

func NewMockCache() *MockCache {
	return &MockCache{
		data: make(map[string][]byte),
	}
}

func (m *MockCache) Get(ctx context.Context, key string) ([]byte, error) {
	if val, ok := m.data[key]; ok {
		return val, nil
	}
	return nil, nil
}

func (m *MockCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	m.data[key] = value
	return nil
}

func (m *MockCache) DeletePattern(ctx context.Context, pattern string) (int64, error) {
	return 0, nil
}

func (m *MockCache) Incr(ctx context.Context, key string) (int64, error) {
	return 0, nil
}

func (m *MockCache) TTL(ctx context.Context, key string) (time.Duration, error) {
	return 0, nil
}

func (m *MockCache) Expire(ctx context.Context, key string, ttl time.Duration) (bool, error) {
	return true, nil
}

func (m *MockCache) Close() error {
	return nil
}

func TestFetchNewTokenUsesClientCredentialsGrant(t *testing.T) {
	called := false
	rt := testutil.RoundTripFunc(func(req *http.Request) (*http.Response, error) {
		called = true
		if req.URL.String() != AuthURL {
			t.Fatalf("expected auth URL %s, got %s", AuthURL, req.URL.String())
		}
		if req.Header.Get("Content-Type") != "application/x-www-form-urlencoded" {
			t.Fatalf("expected form content type, got %q", req.Header.Get("Content-Type"))
		}
		if !strings.HasPrefix(req.Header.Get("Authorization"), "Basic ") {
			t.Fatalf("expected basic auth header, got %q", req.Header.Get("Authorization"))
		}

		rawBody, err := io.ReadAll(req.Body)
		if err != nil {
			t.Fatalf("read request body: %v", err)
		}
		form, err := url.ParseQuery(string(rawBody))
		if err != nil {
			t.Fatalf("parse request body: %v", err)
		}
		if form.Get("grant_type") != "client_credentials" {
			t.Fatalf("expected client_credentials grant, got %q", form.Get("grant_type"))
		}
		if form.Get("refresh_token") != "" {
			t.Fatal("client-credentials auth must not send a refresh_token")
		}

		return testutil.JSONResponse(http.StatusOK, map[string]any{
			"access_token": "test-token",
			"expires_in":   3600,
			"token_type":   "Bearer",
		}), nil
	})

	client := NewClient("id", "secret", clients.NoOpCache{}, clients.WithHTTPClient(testutil.HTTPClient(rt)))

	token, expires, err := client.fetchNewToken()
	if err != nil {
		t.Fatalf("fetchNewToken failed: %v", err)
	}
	if token != "test-token" {
		t.Fatalf("expected token test-token, got %q", token)
	}
	if expires != 3600 {
		t.Fatalf("expected expiry 3600, got %d", expires)
	}
	if !called {
		t.Fatal("expected token endpoint to be called")
	}
}

func TestSearchAlbums(t *testing.T) {
	mockResponse := map[string]interface{}{
		"albums": map[string]interface{}{
			"items": []map[string]interface{}{
				{"id": "1", "name": "Album 1", "type": "album"},
			},
			"total":  1,
			"limit":  20,
			"offset": 0,
		},
	}

	mockBody, _ := json.Marshal(mockResponse)

	mockTransport := &MockRoundTripper{
		Response: &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(mockBody)),
			Header:     make(http.Header),
		},
	}

	cache := NewMockCache()
	client := NewClient("id", "secret", cache, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))
	// Pre-fill token to avoid auth call in this test or handle auth in mock
	client.token = "test-token"

	resp, err := client.SearchAlbums(context.Background(), "test", 20, 0)
	if err != nil {
		t.Fatalf("SearchAlbums failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}

func TestGetAlbum(t *testing.T) {
	mockResponse := map[string]interface{}{
		"id":   "1",
		"name": "Album 1",
	}
	mockBody, _ := json.Marshal(mockResponse)

	mockTransport := &MockRoundTripper{
		Response: &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(mockBody)),
			Header:     make(http.Header),
		},
	}

	cache := NewMockCache()
	client := NewClient("id", "secret", cache, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))
	client.token = "test-token"

	resp, err := client.GetAlbum(context.Background(), "1")
	if err != nil {
		t.Fatalf("GetAlbum failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}
