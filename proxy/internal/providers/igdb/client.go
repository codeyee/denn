package igdb

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"

	cachettl "github.com/codeyee/denn-proxy/internal/cache"
	"github.com/codeyee/denn-proxy/internal/clients"
)

const (
	AuthURL        = "https://id.twitch.tv/oauth2/token"
	BaseURL        = "https://api.igdb.com/v4"
	authBase       = "https://id.twitch.tv"
	authPath       = "/oauth2/token"
	TokenKey       = "auth:igdb:token"
	TokenExpiryKey = "auth:igdb:expiry"
	TokenBuffer    = 5 * time.Minute
)

type Client struct {
	*clients.CachedClient
	clientID     string
	clientSecret string
	cache        clients.Cache
	// oauthClient runs the Twitch client-credentials exchange through the
	// shared BaseClient so transient 5xx/429 are retried with jitter.
	oauthClient *clients.BaseClient
	mu          sync.RWMutex
	token       string
	tokenExpiry time.Time
}

type AuthResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	TokenType   string `json:"token_type"`
}

// oauthRetry keeps the token endpoint responsive: tighter envelope than the
// default API retries so a Twitch hiccup doesn't gate every IGDB call.
var oauthRetry = clients.RetryConfig{
	MaxRetries:     3,
	InitialBackoff: 200 * time.Millisecond,
	MaxBackoff:     2 * time.Second,
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

	c.oauthClient = clients.NewBaseClient(authBase,
		clients.WithAPIName("igdb-oauth"),
		clients.WithHTTPClient(baseClient.HTTPClient()),
		clients.WithHeaders(c.oauthHeaders),
		clients.WithRetryConfig(oauthRetry),
	)

	cacheConfig := clients.CacheConfig{
		KeyTemplates: map[string]string{
			"api_igdb_search":             "igdb:search:{query}:{limit}:{offset}:{body_hash}",
			"api_igdb_details":            "igdb:details:{game_id}:{body_hash}",
			"api_igdb_bulk":               "igdb:bulk:{ids_hash}:{body_hash}",
			"api_igdb_game_time_to_beats": "igdb:game-time-to-beats:{ids_hash}:{body_hash}",
			"api_igdb_popular":            "igdb:popular:{limit}:{offset}:{body_hash}",
			"api_igdb_recent":             "igdb:recent:{limit}:{offset}:{until}:{body_hash}",
			"api_igdb_popularity":         "igdb:popularity:{popularity_type}:{limit}:{body_hash}",
		},
		TTLs: map[string]time.Duration{
			"api_igdb_search":             cachettl.SearchTTL,
			"api_igdb_details":            cachettl.DetailTTL,
			"api_igdb_bulk":               cachettl.DetailTTL,
			"api_igdb_game_time_to_beats": cachettl.DetailTTL,
			"api_igdb_popular":            cachettl.CatalogueTTL,
			"api_igdb_recent":             cachettl.CatalogueTTL,
			"api_igdb_popularity":         cachettl.CatalogueTTL,
		},
	}

	c.CachedClient = clients.NewCachedClient(baseClient, cache, cacheConfig)
	return c
}

// getAuthHeaders returns the per-request headers for IGDB API calls. On token
// failure we now send a deterministic invalid Authorization so IGDB responds
// with 401, which BaseClient classifies and the service layer turns into
// ErrProviderAuth — instead of the previous silent partial-headers degradation
// that produced random 400s.
func (c *Client) getAuthHeaders() map[string]string {
	token, err := c.getOrRefreshToken()
	if err != nil {
		log.Printf("igdb: token unavailable, request will fail: %v", err)
		return map[string]string{
			"Client-ID":     c.clientID,
			"Authorization": "Bearer invalid-token-after-oauth-failure",
			"Content-Type":  "text/plain",
			"Accept":        "application/json",
		}
	}

	return map[string]string{
		"Client-ID":     c.clientID,
		"Authorization": fmt.Sprintf("Bearer %s", token),
		"Content-Type":  "text/plain",
		"Accept":        "application/json",
	}
}

// oauthHeaders supplies the form-urlencoded content type the Twitch token
// endpoint requires. Credentials travel in the body, not as Basic auth.
func (c *Client) oauthHeaders() map[string]string {
	return map[string]string{
		"Content-Type": "application/x-www-form-urlencoded",
		"Accept":       "application/json",
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

	resp, err := c.oauthClient.Request(context.Background(), http.MethodPost, authPath, nil, params.Encode())
	if err != nil {
		// Surface as ErrProviderAuth so callers can classify a token failure
		// the same way they classify a 401 on a normal API call.
		if errors.Is(err, clients.ErrUpstreamExhausted) || errors.Is(err, clients.ErrConnection) || errors.Is(err, clients.ErrTimeout) {
			return "", 0, fmt.Errorf("%w: %w", clients.ErrProviderAuth, err)
		}
		return "", 0, fmt.Errorf("igdb auth request: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", 0, fmt.Errorf("%w: igdb auth status %d", clients.ErrProviderAuth, resp.StatusCode)
	}

	var authResp AuthResponse
	if err := json.Unmarshal(resp.Data, &authResp); err != nil {
		return "", 0, err
	}

	return authResp.AccessToken, authResp.ExpiresIn, nil
}
