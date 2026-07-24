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

func TestFetchAndParseChartsUsesStableBrowserHeaders(t *testing.T) {
	rt := testutil.RoundTripFunc(func(req *http.Request) (*http.Response, error) {
		if req.URL.String() != ChartsURL {
			t.Fatalf("expected charts URL %s, got %s", ChartsURL, req.URL.String())
		}
		for header, expected := range map[string]string{
			"Accept":              "application/json",
			"App-Platform":        "Browser",
			"Origin":              "https://charts.spotify.com",
			"Referer":             "https://charts.spotify.com/",
			"Spotify-App-Version": "0.0.0.production",
		} {
			if got := req.Header.Get(header); got != expected {
				t.Fatalf("expected %s header %q, got %q", header, expected, got)
			}
		}
		if got := req.Header.Get("Authorization"); got != "" {
			t.Fatalf("charts request must not use an expiring browser bearer token, got %q", got)
		}

		return testutil.JSONResponse(http.StatusOK, map[string]any{
			"chartEntryViewResponses": []any{
				map[string]any{"entries": []any{
					map[string]any{"albumMetadata": map[string]any{
						"albumUri":  "spotify:album:album-1",
						"albumName": "Album One",
					}},
				}},
			},
		}), nil
	})

	client := NewClient("id", "secret", clients.NoOpCache{},
		clients.WithHTTPClient(testutil.HTTPClient(rt)))

	albums, err := client.fetchAndParseCharts(context.Background())
	if err != nil {
		t.Fatalf("fetchAndParseCharts failed: %v", err)
	}
	if len(albums) != 1 || albums[0].ID != "album-1" {
		t.Fatalf("expected parsed album-1, got %#v", albums)
	}
}

func TestParseChartAlbumsFindsAlbumEntriesByShape(t *testing.T) {
	data := chartsResponse{
		ChartEntryViewResponses: []chartEntryView{
			{Entries: []chartEntry{{}}},
			{Entries: []chartEntry{{
				AlbumMetadata: chartAlbumMetadata{
					AlbumURI:  "spotify:album:album-1",
					AlbumName: "Album One",
				},
			}}},
			{Entries: []chartEntry{
				{AlbumMetadata: chartAlbumMetadata{
					AlbumURI:  "spotify:album:album-2",
					AlbumName: "Album Two",
				}},
				{AlbumMetadata: chartAlbumMetadata{
					AlbumURI:  "spotify:album:album-1",
					AlbumName: "Duplicate Album One",
				}},
				{AlbumMetadata: chartAlbumMetadata{
					AlbumURI:  "spotify:track:not-an-album",
					AlbumName: "Malformed",
				}},
			}},
		},
	}

	albums, err := parseChartAlbums(data)
	if err != nil {
		t.Fatalf("parseChartAlbums failed: %v", err)
	}
	if len(albums) != 2 {
		t.Fatalf("expected 2 unique albums, got %d", len(albums))
	}
	if albums[0].ID != "album-1" || albums[1].ID != "album-2" {
		t.Fatalf("expected chart order [album-1 album-2], got [%s %s]", albums[0].ID, albums[1].ID)
	}
}

func TestParseChartAlbumsRejectsSchemaWithoutAlbums(t *testing.T) {
	data := chartsResponse{
		ChartEntryViewResponses: []chartEntryView{
			{Entries: []chartEntry{{}}},
		},
	}

	albums, err := parseChartAlbums(data)
	if err == nil {
		t.Fatalf("expected schema error, got albums %#v", albums)
	}
}

func TestGetChartAlbumsFallsBackToLastKnownGoodChart(t *testing.T) {
	cache := NewMockCache()
	stale, err := json.Marshal([]chartAlbum{{
		ID:   "stale-album",
		Name: "Last Known Good",
	}})
	if err != nil {
		t.Fatalf("marshal stale chart: %v", err)
	}
	cache.data[ChartsStaleKey] = stale

	rt := testutil.RoundTripFunc(func(req *http.Request) (*http.Response, error) {
		return testutil.JSONResponse(http.StatusBadRequest, map[string]any{
			"error": "upstream contract changed",
		}), nil
	})
	client := NewClient("id", "secret", cache,
		clients.WithHTTPClient(testutil.HTTPClient(rt)))

	albums, err := client.getChartAlbums(context.Background())
	if err != nil {
		t.Fatalf("expected stale fallback, got error: %v", err)
	}
	if len(albums) != 1 || albums[0].ID != "stale-album" {
		t.Fatalf("expected stale-album fallback, got %#v", albums)
	}
}
