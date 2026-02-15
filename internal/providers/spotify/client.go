package spotify

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
)

const (
	AuthURL      = "https://accounts.spotify.com/api/token"
	BaseURL      = "https://api.spotify.com/v1"
	ChartsURL    = "https://charts-spotify-com-service.spotify.com/public/v0/charts"
	TokenKey     = "auth:spotify:token"
	ChartsKey    = "api:spotify:charts:albums"
	TokenBuffer  = 5 * time.Minute
	ChartsTTL    = 7 * 24 * time.Hour
)

type Client struct {
	*clients.CachedClient
	clientID     string
	clientSecret string
	cache        clients.Cache
	httpClient   *http.Client
	mu           sync.RWMutex
	token        string
}

type AuthResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	TokenType   string `json:"token_type"`
}

func NewClient(clientID, clientSecret string, cache clients.Cache, opts ...clients.ClientOption) *Client {
	c := &Client{
		clientID:     clientID,
		clientSecret: clientSecret,
		cache:        cache,
		httpClient:   http.DefaultClient,
	}

	baseClient := clients.NewBaseClient(BaseURL,
		append([]clients.ClientOption{
			clients.WithAPIName("spotify"),
			clients.WithHeaders(c.getAuthHeaders),
		}, opts...)...,
	)

	cacheConfig := clients.CacheConfig{
		KeyTemplates: map[string]string{
			"spotify_search":       "spotify:search:{query}:{limit}:{offset}",
			"spotify_details":      "spotify:details:{album_id}",
			"spotify_bulk":         "spotify:bulk:{ids_hash}",
		},
		TTLs: map[string]time.Duration{
			"spotify_search":  6 * time.Hour,
			"spotify_details": 12 * time.Hour,
			"spotify_bulk":    12 * time.Hour,
		},
	}

	c.CachedClient = clients.NewCachedClient(baseClient, cache, cacheConfig)
	c.httpClient = baseClient.HTTPClient()
	return c
}

func (c *Client) getAuthHeaders() map[string]string {
	token, err := c.getOrRefreshToken()
	if err != nil {
		fmt.Printf("Error getting Spotify token: %v\n", err)
		return map[string]string{}
	}

	return map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", token),
		"Content-Type":  "application/json",
		"Accept":        "application/json",
	}
}

func (c *Client) getOrRefreshToken() (string, error) {
	c.mu.RLock()
	if c.token != "" {
		c.mu.RUnlock()
		return c.token, nil
	}
	c.mu.RUnlock()

	c.mu.Lock()
	defer c.mu.Unlock()

	if c.token != "" {
		return c.token, nil
	}

	ctx := context.Background()
	cachedToken, err := c.cache.Get(ctx, TokenKey)
	if err == nil && cachedToken != nil {
		c.token = string(cachedToken)
		return c.token, nil
	}

	token, expires, err := c.fetchNewToken()
	if err != nil {
		return "", err
	}

	ttl := time.Duration(expires)*time.Second - TokenBuffer
	if ttl < 0 {
		ttl = 1 * time.Minute
	}

	_ = c.cache.Set(ctx, TokenKey, []byte(token), ttl)

	c.token = token
	return c.token, nil
}

func (c *Client) fetchNewToken() (string, int, error) {
	credentials := fmt.Sprintf("%s:%s", c.clientID, c.clientSecret)
	encoded := base64.StdEncoding.EncodeToString([]byte(credentials))

	data := url.Values{}
	data.Set("grant_type", "client_credentials")

	req, err := http.NewRequest(http.MethodPost, AuthURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", 0, fmt.Errorf("create auth request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Basic %s", encoded))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("spotify auth request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", 0, fmt.Errorf("failed to authenticate with Spotify: status %d", resp.StatusCode)
	}

	var authResp AuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
		return "", 0, fmt.Errorf("decode auth response: %w", err)
	}

	return authResp.AccessToken, authResp.ExpiresIn, nil
}
