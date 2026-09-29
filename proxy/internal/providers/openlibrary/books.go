package openlibrary

import (
	"context"
	"net/url"
	"strconv"
	"strings"

	"github.com/codeyee/denn-proxy/internal/clients"
	servicecommon "github.com/codeyee/denn-proxy/internal/services/common"
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
		"query": servicecommon.NormalizeSearchCacheKey(query),
		"page":  strconv.Itoa(page),
		"limit": strconv.Itoa(limit),
	})
}

func (c *Client) GetBook(ctx context.Context, bookID string) (*clients.Response, error) {
	workID := strings.TrimPrefix(bookID, "/works/")
	params := url.Values{
		// OpenLibrary search no longer matches a bare work id in `q`; the
		// explicit key field returns exactly that work.
		"q":      {"key:/works/" + workID},
		"limit":  {"1"},
		"fields": {"*"},
	}

	// A new cache namespace keeps empty results cached by the old query from
	// being served as not-found.
	return c.CachedGet(ctx, "search.json", "ol_work_details", params, map[string]string{
		"book_id": workID,
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

func (c *Client) GetRecentBooks(ctx context.Context, page, limit int) (*clients.Response, error) {
	offset := (page - 1) * limit
	params := url.Values{
		"q":      {"*"},
		"sort":   {"new"},
		"limit":  {strconv.Itoa(limit)},
		"offset": {strconv.Itoa(offset)},
		"fields": {"*"},
	}

	return c.CachedGet(ctx, "search.json", "ol_recent", params, map[string]string{
		"page":  strconv.Itoa(page),
		"limit": strconv.Itoa(limit),
	})
}
