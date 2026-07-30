package tmdb

import (
	"context"
	"fmt"
	"net/url"
	"strconv"

	"github.com/codeyee/denn-proxy/internal/clients"
	servicecommon "github.com/codeyee/denn-proxy/internal/services/common"
)

func (c *Client) SearchTVShows(ctx context.Context, query string, page int) (*clients.Response, error) {
	return c.SearchTVShowsWithAdult(ctx, query, page, false)
}

func (c *Client) SearchTVShowsWithAdult(
	ctx context.Context,
	query string,
	page int,
	allowAdult bool,
) (*clients.Response, error) {
	includeAdult := strconv.FormatBool(allowAdult)
	adultPolicy := "exclude"
	if allowAdult {
		adultPolicy = "include"
	}
	params := url.Values{
		"query":         {query},
		"page":          {strconv.Itoa(page)},
		"include_adult": {includeAdult},
	}

	return c.CachedGet(ctx, "search/tv", "search_tv", params, map[string]string{
		"query": servicecommon.NormalizeSearchCacheKey(query),
		"page":  strconv.Itoa(page),
		"adult": adultPolicy,
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

func (c *Client) GetPopularTVShows(ctx context.Context, page int) (*clients.Response, error) {
	params := url.Values{
		"page": {strconv.Itoa(page)},
	}

	return c.CachedGet(ctx, "tv/popular", "popular_tv", params, map[string]string{
		"page": strconv.Itoa(page),
	})
}

func (c *Client) GetRecentTVShows(ctx context.Context, page int, until string) (*clients.Response, error) {
	params := url.Values{
		"page":               {strconv.Itoa(page)},
		"sort_by":            {"first_air_date.desc"},
		"first_air_date.lte": {until},
		"include_adult":      {"false"},
	}

	return c.CachedGet(ctx, "discover/tv", "recent_tv", params, map[string]string{
		"page":  strconv.Itoa(page),
		"until": until,
	})
}
