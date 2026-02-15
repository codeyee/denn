package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/models"
	olclient "github.com/codeyee/denn-proxy/internal/providers/openlibrary"
	"github.com/codeyee/denn-proxy/internal/services/books"
	"github.com/codeyee/denn-proxy/internal/services/books/mapper"
)

type SearchResult struct {
	Page         int                 `json:"page"`
	TotalPages   int                 `json:"total_pages"`
	TotalResults int                 `json:"total_results"`
	Results      []models.SearchItem `json:"results"`
}

type BulkBookResult struct {
	ID    string       `json:"id"`
	Book  *models.Book `json:"data,omitempty"`
	Error string       `json:"error,omitempty"`
}

type Service struct {
	client *olclient.Client
}

func NewService(client *olclient.Client) *Service {
	return &Service{client: client}
}

func unmarshalResponse[T any](resp *clients.Response, err error) (T, error) {
	var zero T

	if err != nil {
		return zero, err
	}

	if resp.StatusCode == 404 {
		return zero, fmt.Errorf("OpenLibrary %w", clients.ErrNotFound)
	}

	if resp.StatusCode == 429 {
		return zero, fmt.Errorf("OpenLibrary %w", clients.ErrRateLimit)
	}

	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		return zero, fmt.Errorf("OpenLibrary %w", clients.ErrProviderAuth)
	}

	if resp.StatusCode >= 500 {
		return zero, fmt.Errorf("OpenLibrary %w", clients.ErrServerError)
	}

	if resp.StatusCode != 200 {
		return zero, fmt.Errorf("OpenLibrary API error (status %d)", resp.StatusCode)
	}

	var result T
	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return zero, fmt.Errorf("unmarshal OpenLibrary response: %w", err)
	}

	return result, nil
}

func (s *Service) SearchBooks(ctx context.Context, query string, page, limit int) (SearchResult, error) {
	data, err := unmarshalResponse[books.OlSearchResponse](s.client.SearchBooks(ctx, query, page, limit))
	if err != nil {
		return SearchResult{}, fmt.Errorf("search books: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Docs))
	for _, doc := range data.Docs {
		items = append(items, mapper.MapSearchItem(doc))
	}

	totalPages := 0
	if data.NumFound > 0 && limit > 0 {
		totalPages = (data.NumFound + limit - 1) / limit
	}

	return SearchResult{
		Page:         page,
		TotalPages:   totalPages,
		TotalResults: data.NumFound,
		Results:      items,
	}, nil
}

func (s *Service) GetBookComplete(ctx context.Context, bookID string) (models.Book, error) {
	data, err := unmarshalResponse[books.OlSearchResponse](s.client.GetBook(ctx, bookID))
	if err != nil {
		return models.Book{}, fmt.Errorf("get book %s: %w", bookID, err)
	}

	if len(data.Docs) == 0 {
		return models.Book{}, fmt.Errorf("get book %s: %w", bookID, clients.ErrNotFound)
	}

	return mapper.MapBook(data.Docs[0]), nil
}

func (s *Service) GetBulkBooks(ctx context.Context, bookIDs []string) []BulkBookResult {
	results := make([]BulkBookResult, len(bookIDs))
	var wg sync.WaitGroup
	sem := make(chan struct{}, 10)

loop:
	for i, id := range bookIDs {
		select {
		case <-ctx.Done():
			break loop
		case sem <- struct{}{}:
		}

		wg.Add(1)

		go func(idx int, bookID string) {
			defer wg.Done()
			defer func() { <-sem }()

			book, err := s.GetBookComplete(ctx, bookID)
			if err != nil {
				results[idx] = BulkBookResult{ID: bookID, Error: err.Error()}
				return
			}

			results[idx] = BulkBookResult{ID: bookID, Book: &book}
		}(i, id)
	}

	wg.Wait()
	return results
}

func (s *Service) GetTrendingBooks(ctx context.Context, page, limit int) (SearchResult, error) {
	totalLimit := 100

	data, err := unmarshalResponse[books.OlSearchResponse](s.client.GetTrendingBooks(ctx, totalLimit))
	if err != nil {
		return SearchResult{}, fmt.Errorf("get trending books: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Docs))
	for _, doc := range data.Docs {
		items = append(items, mapper.MapSearchItem(doc))
	}

	total := len(items)
	offset := (page - 1) * limit
	end := offset + limit

	if offset >= total {
		items = []models.SearchItem{}
	} else {
		if end > total {
			end = total
		}
		items = items[offset:end]
	}

	totalPages := 0
	if total > 0 && limit > 0 {
		totalPages = (total + limit - 1) / limit
	}

	return SearchResult{
		Page:         page,
		TotalPages:   totalPages,
		TotalResults: total,
		Results:      items,
	}, nil
}
