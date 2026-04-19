package spotify

import (
	"context"
	"encoding/base64"
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
	AuthURL     = "https://accounts.spotify.com/api/token"
	BaseURL     = "https://api.spotify.com/v1"
	ChartsURL   = "https://charts-spotify-com-service.spotify.com/public/v0/charts"
	authBase    = "https://accounts.spotify.com"
	authPath    = "/api/token"
	chartsBase  = "https://charts-spotify-com-service.spotify.com"
	chartsPath  = "/public/v0/charts"
	TokenKey    = "auth:spotify:token"
	ChartsKey   = "api:spotify:charts:albums"
	TokenBuffer = 5 * time.Minute
	ChartsTTL   = 7 * 24 * time.Hour
)

type Client struct {
	*clients.CachedClient
	clientID     string
	clientSecret string
	cache        clients.Cache
	// oauthClient handles the client-credentials token exchange. It uses the
	// shared BaseClient retry/backoff machinery so transient 5xx/429 from
	// accounts.spotify.com are retried with jitter just like normal API calls.
	oauthClient *clients.BaseClient
	// chartsClient handles the public charts endpoint, separate from the API
	// host but with the same retry semantics.
	chartsClient *clients.BaseClient
	mu           sync.RWMutex
	token        string
	tokenExpiry  time.Time
}

type AuthResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	TokenType   string `json:"token_type"`
}

// oauthRetry is the retry profile we use for the token endpoint. Tokens are
// short, latency-sensitive, and accounts.spotify.com is generally reliable —
// so we use a tighter envelope than the default per-API retries.
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
			clients.WithAPIName("spotify"),
			clients.WithHeaders(c.getAuthHeaders),
		}, opts...)...,
	)

	// Reuse the API client's transport for the OAuth and Charts endpoints so
	// tests that swap the underlying http.Client transport (via
	// clients.WithHTTPClient) continue to intercept all three hosts. In
	// production the same *http.Client is fine because each call carries its
	// own URL, headers, and timeout via BaseClient.
	sharedHTTP := baseClient.HTTPClient()

	c.oauthClient = clients.NewBaseClient(authBase,
		clients.WithAPIName("spotify-oauth"),
		clients.WithHTTPClient(sharedHTTP),
		clients.WithHeaders(c.oauthHeaders),
		clients.WithRetryConfig(oauthRetry),
	)
	c.chartsClient = clients.NewBaseClient(chartsBase,
		clients.WithAPIName("spotify-charts"),
		clients.WithHTTPClient(sharedHTTP),
		clients.WithHeaders(c.chartsHeaders),
	)

	cacheConfig := clients.CacheConfig{
		KeyTemplates: map[string]string{
			"spotify_search":  "spotify:search:{query}:{limit}:{offset}",
			"spotify_details": "spotify:details:{album_id}",
		},
		TTLs: map[string]time.Duration{
			"spotify_search":  cachettl.SearchTTL,
			"spotify_details": cachettl.AlbumDetailTTL,
		},
	}

	c.CachedClient = clients.NewCachedClient(baseClient, cache, cacheConfig)
	return c
}

// getAuthHeaders builds the per-request headers for normal Spotify Web API
// calls. Token failures are no longer silently swallowed: instead we return
// a synthetic Authorization that triggers a 401, forcing the BaseClient to
// surface ErrProviderAuth on the next call. (The headers callback signature
// is fixed by clients.WithHeaders, so this is the cleanest way to fail loud
// without leaking nil maps.)
func (c *Client) getAuthHeaders() map[string]string {
	token, err := c.getOrRefreshToken()
	if err != nil {
		log.Printf("spotify: token unavailable, request will fail: %v", err)
		return map[string]string{
			// Send a deterministic invalid token so Spotify replies 401 and
			// the service layer surfaces ErrProviderAuth instead of a vague
			// 400. The previous empty-map behavior produced non-deterministic
			// 400/401 responses that hid the real failure.
			"Authorization": "Bearer invalid-token-after-oauth-failure",
			"Content-Type":  "application/json",
			"Accept":        "application/json",
		}
	}

	return map[string]string{
		"Authorization": fmt.Sprintf("Bearer %s", token),
		"Content-Type":  "application/json",
		"Accept":        "application/json",
	}
}

// oauthHeaders supplies the basic-auth + form-urlencoded content type the
// token endpoint expects. Computed per-request because credentials never
// change but BaseClient still calls headersFn on every attempt.
func (c *Client) oauthHeaders() map[string]string {
	credentials := fmt.Sprintf("%s:%s", c.clientID, c.clientSecret)
	encoded := base64.StdEncoding.EncodeToString([]byte(credentials))
	return map[string]string{
		"Authorization": fmt.Sprintf("Basic %s", encoded),
		"Content-Type":  "application/x-www-form-urlencoded",
		"Accept":        "application/json",
	}
}

// chartsHeaders is a thin wrapper because Spotify's charts API does not
// require auth but does want a JSON Accept header.
func (c *Client) chartsHeaders() map[string]string {
	return map[string]string{
		"Accept": "application/json",
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

	if c.tokenValid() {
		return c.token, nil
	}

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
	data := url.Values{}
	data.Set("grant_type", "client_credentials")

	// Route through the shared BaseClient so 5xx/429 from accounts.spotify.com
	// get the same backoff + Retry-After handling as our regular API calls.
	resp, err := c.oauthClient.Request(context.Background(), http.MethodPost, authPath, nil, data.Encode())
	if err != nil {
		// Wrap with ErrProviderAuth so callers can classify the failure
		// even when the underlying problem was network-level.
		if errors.Is(err, clients.ErrUpstreamExhausted) || errors.Is(err, clients.ErrConnection) || errors.Is(err, clients.ErrTimeout) {
			return "", 0, fmt.Errorf("%w: %w", clients.ErrProviderAuth, err)
		}
		return "", 0, fmt.Errorf("spotify auth request: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", 0, fmt.Errorf("%w: spotify auth status %d", clients.ErrProviderAuth, resp.StatusCode)
	}

	var authResp AuthResponse
	if err := json.Unmarshal(resp.Data, &authResp); err != nil {
		return "", 0, fmt.Errorf("decode auth response: %w", err)
	}

	return authResp.AccessToken, authResp.ExpiresIn, nil
}
