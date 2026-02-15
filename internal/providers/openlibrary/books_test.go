package openlibrary

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

func (m *MockCache) Expire(ctx context.Context, key string, ttl time.Duration) (bool, error) {
	return true, nil
}

func (m *MockCache) Close() error {
	return nil
}

func TestSearchBooks(t *testing.T) {
	mockResponse := map[string]interface{}{
		"numFound": 1,
		"docs": []map[string]interface{}{
			{"key": "/works/OL123W", "title": "Test Book"},
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
	client := NewClient(cache, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))

	resp, err := client.SearchBooks(context.Background(), "test", 1, 20)
	if err != nil {
		t.Fatalf("SearchBooks failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}

func TestGetBook(t *testing.T) {
	mockResponse := map[string]interface{}{
		"numFound": 1,
		"docs": []map[string]interface{}{
			{"key": "/works/OL123W", "title": "Test Book"},
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
	client := NewClient(cache, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))

	resp, err := client.GetBook(context.Background(), "OL123W")
	if err != nil {
		t.Fatalf("GetBook failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}

func TestGetTrendingBooks(t *testing.T) {
	mockResponse := map[string]interface{}{
		"numFound": 1,
		"docs": []map[string]interface{}{
			{"key": "/works/OL123W", "title": "Trending Book"},
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
	client := NewClient(cache, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))

	resp, err := client.GetTrendingBooks(context.Background(), 20)
	if err != nil {
		t.Fatalf("GetTrendingBooks failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}
