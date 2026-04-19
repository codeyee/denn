package openlibrary

import (
	"context"
	"net/url"
	"strconv"

	"github.com/codeyee/denn-proxy/internal/clients"
)

func (c *Client) SearchBooks(ctx context.Context, query string, page, limit int) (*clients.Response, error) {
	offset := (page - 1) * limit

	params := url.Values{
		"q":      {query},
		"limit":  {strconv.Itoa(limit)},
		"offset": {strconv.Itoa(offset)},
		"fields": {"*"},
	}

	return c.CachedGet(ctx, "search.json", "ol_search", params, map[string]string{
		"query": query,
		"page":  strconv.Itoa(page),
		"limit": strconv.Itoa(limit),
	})
}

func (c *Client) GetBook(ctx context.Context, bookID string) (*clients.Response, error) {
	params := url.Values{
		"q":      {bookID},
		"limit":  {"1"},
		"fields": {"*"},
	}

	return c.CachedGet(ctx, "search.json", "ol_details", params, map[string]string{
		"book_id": bookID,
	})
}

func (c *Client) GetTrendingBooks(ctx context.Context, limit int) (*clients.Response, error) {
	params := url.Values{
		"q":      {"bestseller"},
		"sort":   {"rating"},
		"limit":  {strconv.Itoa(limit)},
		"fields": {"*"},
	}

	return c.CachedGet(ctx, "search.json", "ol_trending", params, map[string]string{
		"limit": strconv.Itoa(limit),
	})
}
