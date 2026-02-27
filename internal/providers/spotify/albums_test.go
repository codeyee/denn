package spotify

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
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
