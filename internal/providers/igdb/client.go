package igdb

import (
	"context"
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
	AuthURL        = "https://id.twitch.tv/oauth2/token"
	BaseURL        = "https://api.igdb.com/v4"
	TokenKey       = "auth:igdb:token"
	TokenExpiryKey = "auth:igdb:expiry"
	TokenBuffer    = 5 * time.Minute
)

type Client struct {
	*clients.CachedClient
	clientID     string
	clientSecret string
	cache        clients.Cache
	mu           sync.RWMutex
	token        string
	tokenExpiry  time.Time
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
	}

	baseClient := clients.NewBaseClient(BaseURL,
		append([]clients.ClientOption{
			clients.WithAPIName("igdb"),
			clients.WithHeaders(c.getAuthHeaders),
		}, opts...)...,
	)

	cacheConfig := clients.CacheConfig{
		KeyTemplates: map[string]string{
			"api_igdb_search":     "igdb:search:{query}:{limit}:{offset}:{body_hash}",
			"api_igdb_details":    "igdb:details:{game_id}:{body_hash}",
			"api_igdb_bulk":       "igdb:bulk:{ids_hash}:{body_hash}",
			"api_igdb_popular":    "igdb:popular:{limit}:{offset}:{body_hash}",
			"api_igdb_popularity": "igdb:popularity:{popularity_type}:{limit}:{body_hash}",
			"api_igdb_trending":   "igdb:trending:{limit}:{offset}",
		},
		TTLs: map[string]time.Duration{
			"api_igdb_search":     24 * time.Hour,
			"api_igdb_details":    48 * time.Hour,
			"api_igdb_bulk":       48 * time.Hour,
			"api_igdb_popular":    24 * time.Hour,
			"api_igdb_popularity": 24 * time.Hour,
			"api_igdb_trending":   24 * time.Hour,
		},
	}

	c.CachedClient = clients.NewCachedClient(baseClient, cache, cacheConfig)
	return c
}

func (c *Client) getAuthHeaders() map[string]string {
	token, err := c.getOrRefreshToken()
	if err != nil {
		fmt.Printf("Error getting IGDB token: %v\n", err)

		return map[string]string{
			"Client-ID": c.clientID,
		}
	}

	return map[string]string{
		"Client-ID":     c.clientID,
		"Authorization": fmt.Sprintf("Bearer %s", token),
		"Content-Type":  "text/plain",
		"Accept":        "application/json",
	}
}

func (c *Client) tokenValid() bool {
	return c.token != "" && (c.tokenExpiry.IsZero() || time.Now().Before(c.tokenExpiry))
}

func (c *Client) getOrRefreshToken() (string, error) {
	c.mu.RLock()
	if c.tokenValid() {
		c.mu.RUnlock()
		return c.token, nil
	}
	c.mu.RUnlock()

	c.mu.Lock()
	defer c.mu.Unlock()

	// Double check
	if c.tokenValid() {
		return c.token, nil
	}

	// Try cache first
	ctx := context.Background()
	cachedToken, err := c.cache.Get(ctx, TokenKey)
	if err == nil && cachedToken != nil {
		c.token = string(cachedToken)
		ttl, _ := c.cache.TTL(ctx, TokenKey)
		if ttl > 0 {
			c.tokenExpiry = time.Now().Add(ttl)
		} else {
			c.tokenExpiry = time.Now().Add(TokenBuffer)
		}
		return c.token, nil
	}

	// Fetch new token
	token, expires, err := c.fetchNewToken()
	if err != nil {
		return "", err
	}

	// Set TTL slightly less than actual expiry to be safe
	ttl := time.Duration(expires)*time.Second - TokenBuffer
	if ttl < 0 {
		ttl = 1 * time.Minute
	}

	_ = c.cache.Set(ctx, TokenKey, []byte(token), ttl)

	c.token = token
	c.tokenExpiry = time.Now().Add(ttl)
	return c.token, nil
}

func (c *Client) ClearToken() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.token = ""
	c.tokenExpiry = time.Time{}
}

func (c *Client) fetchNewToken() (string, int, error) {
	params := url.Values{}
	params.Set("client_id", c.clientID)
	params.Set("client_secret", c.clientSecret)
	params.Set("grant_type", "client_credentials")

	req, err := http.NewRequest(http.MethodPost, AuthURL, strings.NewReader(params.Encode()))
	if err != nil {
		return "", 0, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.HTTPClient().Do(req)
	if err != nil {
		return "", 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", 0, fmt.Errorf("failed to authenticate with IGDB: status %d", resp.StatusCode)
	}

	var authResp AuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
		return "", 0, err
	}

	return authResp.AccessToken, authResp.ExpiresIn, nil
}
