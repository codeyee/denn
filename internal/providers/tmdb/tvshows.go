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

func (c *Client) GetBulkTVShows(ctx context.Context, tvIDs []int) []BulkResult {
	results := make([]BulkResult, len(tvIDs))

	fetchBulk(len(tvIDs), func(idx int) {
		tvID := tvIDs[idx]

		resp, err := c.GetTVDetails(ctx, tvID, "")
		if err != nil {
			results[idx] = BulkResult{ID: tvID, StatusCode: 500}
			return
		}

		if resp.StatusCode == 200 {
			results[idx] = BulkResult{ID: tvID, Data: resp.Data, StatusCode: 200}
		} else {
			results[idx] = BulkResult{ID: tvID, Error: resp.Data, StatusCode: resp.StatusCode}
		}
	})

	return results
}

func (c *Client) GetBulkSeasons(ctx context.Context, requests []SeasonRequest) []BulkSeasonResult {
	results := make([]BulkSeasonResult, len(requests))

	fetchBulk(len(requests), func(idx int) {
		r := requests[idx]

		resp, err := c.GetSeasonDetails(ctx, r.TVShowID, r.SeasonNumber)
		if err != nil {
			results[idx] = BulkSeasonResult{
				TVShowID: r.TVShowID, SeasonNumber: r.SeasonNumber, StatusCode: 500,
			}
			return
		}

		if resp.StatusCode == 200 {
			results[idx] = BulkSeasonResult{
				TVShowID: r.TVShowID, SeasonNumber: r.SeasonNumber,
				Data: resp.Data, StatusCode: 200,
			}
		} else {
			results[idx] = BulkSeasonResult{
				TVShowID: r.TVShowID, SeasonNumber: r.SeasonNumber,
				Error: resp.Data, StatusCode: resp.StatusCode,
			}
		}
	})

	return results
}

func (c *Client) GetPopularTV(ctx context.Context, page int) (*clients.Response, error) {
	params := url.Values{"page": {strconv.Itoa(page)}}

	return c.CachedGet(ctx, "tv/popular", "popular_tv", params, map[string]string{
		"page": strconv.Itoa(page),
	})
}

func (c *Client) GetTVExternalIDs(ctx context.Context, tvID int) (*clients.Response, error) {
	endpoint := fmt.Sprintf("tv/%d/external_ids", tvID)

	return c.CachedGet(ctx, endpoint, "external_ids_tv", nil, map[string]string{
		"id": strconv.Itoa(tvID),
	})
}

func (c *Client) GetSeasonExternalIDs(ctx context.Context, tvID, seasonNumber int) (*clients.Response, error) {
	endpoint := fmt.Sprintf("tv/%d/season/%d/external_ids", tvID, seasonNumber)

	return c.CachedGet(ctx, endpoint, "external_ids_season", nil, map[string]string{
		"id":     strconv.Itoa(tvID),
		"season": strconv.Itoa(seasonNumber),
	})
}

func (c *Client) GetTVWatchProviders(ctx context.Context, tvID int) (*clients.Response, error) {
	endpoint := fmt.Sprintf("tv/%d/watch/providers", tvID)

	return c.CachedGet(ctx, endpoint, "watch_providers_tv", nil, map[string]string{
		"id": strconv.Itoa(tvID),
	})
}

func (c *Client) GetSeasonWatchProviders(ctx context.Context, tvID, seasonNumber int) (*clients.Response, error) {
	endpoint := fmt.Sprintf("tv/%d/season/%d/watch/providers", tvID, seasonNumber)

	return c.CachedGet(ctx, endpoint, "watch_providers_season", nil, map[string]string{
		"id":     strconv.Itoa(tvID),
		"season": strconv.Itoa(seasonNumber),
	})
}

func (c *Client) GetTVImages(ctx context.Context, tvID int) (*clients.Response, error) {
	endpoint := fmt.Sprintf("tv/%d/images", tvID)

	return c.CachedGet(ctx, endpoint, "images_tv", nil, map[string]string{
		"id": strconv.Itoa(tvID),
	})
}

func (c *Client) GetSeasonImages(ctx context.Context, tvID, seasonNumber int) (*clients.Response, error) {
	endpoint := fmt.Sprintf("tv/%d/season/%d/images", tvID, seasonNumber)

	return c.CachedGet(ctx, endpoint, "images_season", nil, map[string]string{
		"id":     strconv.Itoa(tvID),
		"season": strconv.Itoa(seasonNumber),
	})
}