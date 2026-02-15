package tmdb

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/models"
	tmdbclient "github.com/codeyee/denn-proxy/internal/providers/tmdb"
)

const (
	movieAppend = "external_ids,watch/providers,images"
	tvAppend    = "external_ids,watch/providers,images"
)

type SearchResult struct {
	Page         int                 `json:"page"`
	TotalPages   int                 `json:"total_pages"`
	TotalResults int                 `json:"total_results"`
	Results      []models.SearchItem `json:"results"`
}

type BulkMovieResult struct {
	ID    int           `json:"id"`
	Movie *models.Movie `json:"data,omitempty"`
	Error string        `json:"error,omitempty"`
}

type BulkTVShowResult struct {
	ID     int            `json:"id"`
	TVShow *models.TVShow `json:"data,omitempty"`
	Error  string         `json:"error,omitempty"`
}

type Service struct {
	client *tmdbclient.Client
}

func NewService(client *tmdbclient.Client) *Service {
	return &Service{client: client}
}

func unmarshalResponse[T any](resp *clients.Response, err error) (T, error) {
	var zero T

	if err != nil {
		return zero, err
	}

	if resp.StatusCode == 404 {
		return zero, fmt.Errorf("Not found")
	}

	if resp.StatusCode != 200 {
		return zero, fmt.Errorf("TMDB API error (status %d)", resp.StatusCode)
	}

	var result T

	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return zero, fmt.Errorf("Failed to unmarshal TMDB response: %w", err)
	}

	return result, nil
}

func (s *Service) SearchMovies(ctx context.Context, query string, page int) (SearchResult, error) {
	data, err := unmarshalResponse[tmdbSearchResponse](s.client.SearchMovies(ctx, query, page))

	if err != nil {
		return SearchResult{}, fmt.Errorf("Search movies: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Results))

	for _, r := range data.Results {
		items = append(items, mapSearchItemMovie(r))
	}

	return SearchResult{
		Page:         data.Page,
		TotalPages:   data.TotalPages,
		TotalResults: data.TotalResults,
		Results:      items,
	}, nil
}

func (s *Service) SearchTVShows(ctx context.Context, query string, page int) (SearchResult, error) {
	data, err := unmarshalResponse[tmdbSearchResponse](s.client.SearchTVShows(ctx, query, page))

	if err != nil {
		return SearchResult{}, fmt.Errorf("Search tv shows: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Results))

	for _, r := range data.Results {
		items = append(items, mapSearchItemTV(r))
	}

	return SearchResult{
		Page:         data.Page,
		TotalPages:   data.TotalPages,
		TotalResults: data.TotalResults,
		Results:      items,
	}, nil
}

func (s *Service) GetMovieComplete(ctx context.Context, movieID int, country string) (models.Movie, error) {
	data, err := unmarshalResponse[tmdbMovieDetail](
		s.client.GetMovieDetails(ctx, movieID, movieAppend),
	)

	if err != nil {
		return models.Movie{}, fmt.Errorf("Get movie %d: %w", movieID, err)
	}

	return mapMovie(data, country), nil
}

func (s *Service) GetTVShowComplete(ctx context.Context, tvID int, country string, expandSeasons bool) (models.TVShow, error) {
	data, err := unmarshalResponse[tmdbTVDetail](
		s.client.GetTVDetails(ctx, tvID, tvAppend),
	)

	if err != nil {
		return models.TVShow{}, fmt.Errorf("Get tv show %d: %w", tvID, err)
	}

	show := mapTVShow(data, country)

	if !expandSeasons {
		seasons := make([]models.Season, 0, len(data.Seasons))

		for _, s := range data.Seasons {
			if isValidSeason(s) {
				seasons = append(seasons, mapSeasonSummary(s))
			}
		}

		show.Seasons = seasons
		return show, nil
	}

	var validSeasons []tmdbSeasonSummary

	for _, s := range data.Seasons {
		if isValidSeason(s) {
			validSeasons = append(validSeasons, s)
		}
	}

	if len(validSeasons) == 0 {
		return show, nil
	}

	seasons := make([]models.Season, len(validSeasons))
	var wg sync.WaitGroup

	for i, summary := range validSeasons {
		wg.Add(1)
		go func(idx int, sn int) {
			defer wg.Done()

			season, err := s.GetSeasonComplete(ctx, tvID, sn, country)
			if err != nil {
				seasons[idx] = mapSeasonSummary(validSeasons[idx])
				return
			}

			seasons[idx] = season
		}(i, summary.SeasonNumber)
	}

	wg.Wait()
	show.Seasons = seasons

	return show, nil
}

func (s *Service) GetSeasonComplete(ctx context.Context, tvID, seasonNumber int, country string) (models.Season, error) {
	type seasonData struct {
		detail    tmdbSeasonDetail
		tvDetail  tmdbTVDetail
		images    *tmdbImagesResponse
		providers *tmdbWatchProvidersResponse
	}

	var (
		sd  seasonData
		mu  sync.Mutex
		wg  sync.WaitGroup
		errs []error
	)

	wg.Add(1)
	go func() {
		defer wg.Done()
		data, err := unmarshalResponse[tmdbSeasonDetail](
			s.client.GetSeasonDetails(ctx, tvID, seasonNumber),
		)
		mu.Lock()
		defer mu.Unlock()
		if err != nil {
			errs = append(errs, fmt.Errorf("season detail: %w", err))
			return
		}
		sd.detail = data
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		data, err := unmarshalResponse[tmdbTVDetail](
			s.client.GetTVDetails(ctx, tvID, ""),
		)
		mu.Lock()
		defer mu.Unlock()
		if err != nil {
			return
		}
		sd.tvDetail = data
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		data, err := unmarshalResponse[tmdbImagesResponse](
			s.client.GetSeasonImages(ctx, tvID, seasonNumber),
		)
		mu.Lock()
		defer mu.Unlock()
		if err != nil {
			return
		}
		sd.images = &data
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		data, err := unmarshalResponse[tmdbWatchProvidersResponse](
			s.client.GetSeasonWatchProviders(ctx, tvID, seasonNumber),
		)
		mu.Lock()
		defer mu.Unlock()
		if err != nil {
			return
		}
		sd.providers = &data
	}()

	wg.Wait()

	for _, err := range errs {
		return models.Season{}, err
	}

	tvShowName := sd.tvDetail.Name

	return mapSeason(sd.detail, tvShowName, sd.images, sd.providers, country), nil
}

func (s *Service) GetBulkMovies(ctx context.Context, ids []int, country string) []BulkMovieResult {
	results := make([]BulkMovieResult, len(ids))
	var wg sync.WaitGroup
	sem := make(chan struct{}, 10)

	for i, id := range ids {
		wg.Add(1)
		sem <- struct{}{}

		go func(idx, movieID int) {
			defer wg.Done()
			defer func() { <-sem }()

			movie, err := s.GetMovieComplete(ctx, movieID, country)
			if err != nil {
				results[idx] = BulkMovieResult{ID: movieID, Error: err.Error()}
				return
			}

			results[idx] = BulkMovieResult{ID: movieID, Movie: &movie}
		}(i, id)
	}

	wg.Wait()
	return results
}

func (s *Service) GetBulkTVShows(ctx context.Context, ids []int, country string) []BulkTVShowResult {
	results := make([]BulkTVShowResult, len(ids))
	var wg sync.WaitGroup
	sem := make(chan struct{}, 10)

	for i, id := range ids {
		wg.Add(1)
		sem <- struct{}{}

		go func(idx, tvID int) {
			defer wg.Done()
			defer func() { <-sem }()

			show, err := s.GetTVShowComplete(ctx, tvID, country, false)
			if err != nil {
				results[idx] = BulkTVShowResult{ID: tvID, Error: err.Error()}
				return
			}

			results[idx] = BulkTVShowResult{ID: tvID, TVShow: &show}
		}(i, id)
	}

	wg.Wait()
	return results
}