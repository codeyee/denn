package tmdb

import (
	"context"
	"fmt"
	"net/url"
	"strconv"

	"github.com/codeyee/denn-proxy/internal/clients"
	servicecommon "github.com/codeyee/denn-proxy/internal/services/common"
)

func (c *Client) SearchMovies(ctx context.Context, query string, page int) (*clients.Response, error) {
	return c.SearchMoviesWithAdult(ctx, query, page, false)
}

func (c *Client) SearchMoviesWithAdult(
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

	return c.CachedGet(ctx, "search/movie", "search_movies", params, map[string]string{
		"query": servicecommon.NormalizeSearchCacheKey(query),
		"page":  strconv.Itoa(page),
		"adult": adultPolicy,
	})
}

func (c *Client) GetMovieDetails(ctx context.Context, movieID int, appendToResponse string) (*clients.Response, error) {
	endpoint := fmt.Sprintf("movie/%d", movieID)
	params := url.Values{}

	if appendToResponse != "" {
		params.Set("append_to_response", appendToResponse)
	}

	return c.CachedGet(ctx, endpoint, "details", params, map[string]string{
		"id":     strconv.Itoa(movieID),
		"append": appendToResponse,
	})
}

func (c *Client) GetPopularMovies(ctx context.Context, page int) (*clients.Response, error) {
	params := url.Values{
		"page": {strconv.Itoa(page)},
	}

	return c.CachedGet(ctx, "movie/popular", "popular_movies", params, map[string]string{
		"page": strconv.Itoa(page),
	})
}

func (c *Client) GetRecentMovies(ctx context.Context, page int, until string) (*clients.Response, error) {
	params := url.Values{
		"page":                     {strconv.Itoa(page)},
		"sort_by":                  {"primary_release_date.desc"},
		"primary_release_date.lte": {until},
		"include_adult":            {"false"},
		"include_video":            {"false"},
	}

	return c.CachedGet(ctx, "discover/movie", "recent_movies", params, map[string]string{
		"page":  strconv.Itoa(page),
		"until": until,
	})
}
