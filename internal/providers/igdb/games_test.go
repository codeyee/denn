package igdb

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

func (m *MockCache) Close() error {
	return nil
}

func TestSearchGames(t *testing.T) {
	mockGames := []map[string]interface{}{
		{
			"id":   1,
			"name": "Test Game",
		},
	}

	mockBody, _ := json.Marshal(mockGames)

	mockTransport := &MockRoundTripper{
		Response: &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(mockBody)),
			Header:     make(http.Header),
		},
	}
	
	mockClient := &http.Client{Transport: mockTransport}
	cache := NewMockCache()
	
	baseClient := clients.NewBaseClient(BaseURL, clients.WithHTTPClient(mockClient))
	c := &Client{
		CachedClient: clients.NewCachedClient(baseClient, cache, clients.CacheConfig{}),
		clientID:     "test-id",
		clientSecret: "test-secret",
		cache:        cache,
		token:        "test-token",
	}

	resp, err := c.SearchGames(context.Background(), "Zelda", 10, 0)
	
	if err != nil {
		t.Fatalf("SearchGames failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("got status %d; want %d", resp.StatusCode, http.StatusOK)
	}
	
	var games []map[string]interface{}
	if err := json.Unmarshal(resp.Data, &games); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}
	
	if len(games) != 1 {
		t.Errorf("got %d games; want 1", len(games))
	}
	
	if games[0]["name"] != "Test Game" {
		t.Errorf("got name %s; want Test Game", games[0]["name"])
	}
}

func TestGetGame(t *testing.T) {
	mockGame := []map[string]interface{}{
		{
			"id":   123,
			"name": "Single Game",
		},
	}
	mockBody, _ := json.Marshal(mockGame)

	mockTransport := &MockRoundTripper{
		Response: &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(mockBody)),
			Header:     make(http.Header),
		},
	}
	
	baseClient := clients.NewBaseClient(BaseURL, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))
	cache := NewMockCache()
	
	c := &Client{
		CachedClient: clients.NewCachedClient(baseClient, cache, clients.CacheConfig{}),
		cache:        cache,
		token:        "test-token",
	}

	resp, err := c.GetGame(context.Background(), 123)
	
	if err != nil {
		t.Fatalf("GetGame failed: %v", err)
	}

	var games []map[string]interface{}
	json.Unmarshal(resp.Data, &games)
	
	if len(games) != 1 {
		t.Errorf("expected 1 game, got %d", len(games))
	}
	
	if games[0]["id"].(float64) != 123 {
		t.Errorf("expected ID 123, got %v", games[0]["id"])
	}
}

func TestGetBulkGames(t *testing.T) {
	mockGames := []map[string]interface{}{
		{"id": 1, "name": "Game 1"},
		{"id": 2, "name": "Game 2"},
	}
	mockBody, _ := json.Marshal(mockGames)

	mockTransport := &MockRoundTripper{
		Response: &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(mockBody)),
			Header:     make(http.Header),
		},
	}
	
	baseClient := clients.NewBaseClient(BaseURL, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))
	cache := NewMockCache()
	
	c := &Client{
		CachedClient: clients.NewCachedClient(baseClient, cache, clients.CacheConfig{}),
		cache:        cache,
		token:        "test-token",
	}

	resp, err := c.GetBulkGames(context.Background(), []int{1, 2})
	
	if err != nil {
		t.Fatalf("GetBulkGames failed: %v", err)
	}

	var games []map[string]interface{}
	json.Unmarshal(resp.Data, &games)
	
	if len(games) != 2 {
		t.Errorf("expected 2 games, got %d", len(games))
	}
}

func TestGetPopularGames(t *testing.T) {
	mockGames := []map[string]interface{}{
		{"id": 1, "name": "Popular Game"},
	}
	mockBody, _ := json.Marshal(mockGames)

	mockTransport := &MockRoundTripper{
		Response: &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(mockBody)),
			Header:     make(http.Header),
		},
	}
	
	baseClient := clients.NewBaseClient(BaseURL, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))
	cache := NewMockCache()
	
	c := &Client{
		CachedClient: clients.NewCachedClient(baseClient, cache, clients.CacheConfig{}),
		cache:        cache,
		token:        "test-token",
	}

	resp, err := c.GetPopularGames(context.Background(), 10, 0)
	if err != nil {
		t.Fatalf("GetPopularGames failed: %v", err)
	}
	
	var games []map[string]interface{}
	json.Unmarshal(resp.Data, &games)
	
	if len(games) != 1 {
		t.Errorf("expected 1 game, got %d", len(games))
	}
}

func TestGetPopularityPrimitives(t *testing.T) {
	mockPrims := []map[string]interface{}{
		{"game_id": 1, "value": 100.0, "popularity_type": 1},
	}
	mockBody, _ := json.Marshal(mockPrims)

	mockTransport := &MockRoundTripper{
		Response: &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(mockBody)),
			Header:     make(http.Header),
		},
	}
	
	baseClient := clients.NewBaseClient(BaseURL, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))
	cache := NewMockCache()
	
	c := &Client{
		CachedClient: clients.NewCachedClient(baseClient, cache, clients.CacheConfig{}),
		cache:        cache,
		token:        "test-token",
	}

	resp, err := c.GetPopularityPrimitives(context.Background(), 1, 10)
	if err != nil {
		t.Fatalf("GetPopularityPrimitives failed: %v", err)
	}
	
	var prims []map[string]interface{}
	json.Unmarshal(resp.Data, &prims)
	
	if len(prims) != 1 {
		t.Errorf("expected 1 primitive, got %d", len(prims))
	}
}

func TestProviderError(t *testing.T) {
	mockTransport := &MockRoundTripper{
		Err: io.EOF, // Simulate network error
	}
	
	baseClient := clients.NewBaseClient(BaseURL, clients.WithHTTPClient(&http.Client{Transport: mockTransport}))
	cache := NewMockCache()
	
	c := &Client{
		CachedClient: clients.NewCachedClient(baseClient, cache, clients.CacheConfig{}),
		cache:        cache,
		token:        "test-token",
	}

	_, err := c.SearchGames(context.Background(), "Fail", 10, 0)
	if err == nil {
		t.Error("expected error, got nil")
	}
}
