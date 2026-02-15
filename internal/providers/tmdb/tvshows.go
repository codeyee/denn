package tmdb

import (
	"context"
	"fmt"
	"net/url"
	"strconv"

	"github.com/codeyee/denn-proxy/internal/clients"
)

func (c *Client) SearchTVShows(ctx context.Context, query string, page int) (*clients.Response, error) {
	params := url.Values{
		"query": {query},
		"page":  {strconv.Itoa(page)},
	}

	return c.CachedGet(ctx, "search/tv", "search_tv", params, map[string]string{
		"query": query,
		"page":  strconv.Itoa(page),
	})
}

func (c *Client) GetTVDetails(ctx context.Context, tvID int, appendToResponse string) (*clients.Response, error) {
	endpoint := fmt.Sprintf("tv/%d", tvID)
	params := url.Values{}

	if appendToResponse != "" {
		params.Set("append_to_response", appendToResponse)
	}

	return c.CachedGet(ctx, endpoint, "details", params, map[string]string{
		"id":     strconv.Itoa(tvID),
		"append": appendToResponse,
	})
}

func (c *Client) GetSeasonDetails(ctx context.Context, tvID, seasonNumber int) (*clients.Response, error) {
	endpoint := fmt.Sprintf("tv/%d/season/%d", tvID, seasonNumber)

	return c.CachedGet(ctx, endpoint, "details", nil, map[string]string{
		"id":     fmt.Sprintf("%d_s%d", tvID, seasonNumber),
		"append": "",
	})
}

func (c *Client) GetSeasonWatchProviders(ctx context.Context, tvID, seasonNumber int) (*clients.Response, error) {
	endpoint := fmt.Sprintf("tv/%d/season/%d/watch/providers", tvID, seasonNumber)

	return c.CachedGet(ctx, endpoint, "watch_providers_season", nil, map[string]string{
		"id":     strconv.Itoa(tvID),
		"season": strconv.Itoa(seasonNumber),
	})
}

func (c *Client) GetSeasonImages(ctx context.Context, tvID, seasonNumber int) (*clients.Response, error) {
	endpoint := fmt.Sprintf("tv/%d/season/%d/images", tvID, seasonNumber)

	return c.CachedGet(ctx, endpoint, "images_season", nil, map[string]string{
		"id":     strconv.Itoa(tvID),
		"season": strconv.Itoa(seasonNumber),
	})
}
