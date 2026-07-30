package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/models"
	igdbclient "github.com/codeyee/denn-proxy/internal/providers/igdb"
	servicecommon "github.com/codeyee/denn-proxy/internal/services/common"
	"github.com/codeyee/denn-proxy/internal/services/games"
	"github.com/codeyee/denn-proxy/internal/services/games/mapper"
)

const (
	WeightWantToPlay         = 0.7
	WeightVisits             = 0.3
	MaxRecencyBoost          = 4.0
	PopulationTypeVisits     = 1
	PopulationTypeWantToPlay = 2
)

type Service struct {
	client *igdbclient.Client
}

func NewService(client *igdbclient.Client) *Service {
	return &Service{client: client}
}

type SearchResult struct {
	Results []models.SearchItem `json:"results"`
}

type scoredGame struct {
	game  models.Game
	score float64
}

func (s *Service) SearchGames(ctx context.Context, query string, limit, offset int) (SearchResult, error) {
	data, err := unmarshalResponse[[]games.IgdbGame](s.client.SearchGames(ctx, query, limit, offset))
	if err != nil {
		if errors.Is(err, clients.ErrProviderAuth) {
			s.client.ClearToken()
		}
		return SearchResult{}, err
	}

	items := make([]models.SearchItem, 0, len(data))
	for _, item := range data {
		items = append(items, mapper.MapSearchItem(item))
	}
	items = servicecommon.FilterEligibleSearchItems(items, time.Now())

	return SearchResult{Results: items}, nil
}

func (s *Service) GetGameComplete(ctx context.Context, id int) (models.Game, error) {
	data, err := unmarshalResponse[[]games.IgdbGame](s.client.GetGame(ctx, id))
	if err != nil {
		if errors.Is(err, clients.ErrProviderAuth) {
			s.client.ClearToken()
		}
		return models.Game{}, err
	}
	if len(data) == 0 {
		// IGDB returns 200 with [] for IDs that don't exist (deleted/private).
		// Surface that as ErrNotFound so the handler maps it to a clean 404
		// instead of falling through to a generic 500.
		return models.Game{}, clients.ErrNotFound
	}
	s.enrichTimeToBeats(ctx, data)

	return mapper.MapGame(data[0]), nil
}

// GetBulkGames fetches the supplied IGDB IDs in fixed-size batches in parallel.
// Per-batch failures are logged and the partial result is returned along with
// a non-nil error so callers (notably homepage enrichment) can decide whether
// to surface a partial response or treat it as a hard failure. The previous
// behavior swallowed all batch errors silently, hiding rate-limit storms.
func (s *Service) GetBulkGames(ctx context.Context, ids []int) ([]models.Game, error) {
	const batchSize = 5
	var (
		allGames  []models.Game
		batchErrs []error
		mu        sync.Mutex
		wg        sync.WaitGroup
	)

	for i := 0; i < len(ids); i += batchSize {
		end := i + batchSize
		if end > len(ids) {
			end = len(ids)
		}

		wg.Add(1)
		go func(batchIDs []int) {
			defer wg.Done()
			data, err := unmarshalResponse[[]games.IgdbGame](s.client.GetBulkGames(ctx, batchIDs))
			if err != nil {
				log.Printf("igdb: bulk games batch %v failed: %v", batchIDs, err)
				mu.Lock()
				batchErrs = append(batchErrs, fmt.Errorf("batch %v: %w", batchIDs, err))
				mu.Unlock()
				return
			}
			s.enrichTimeToBeats(ctx, data)

			mu.Lock()
			for _, item := range data {
				allGames = append(allGames, mapper.MapGame(item))
			}
			mu.Unlock()
		}(ids[i:end])
	}

	wg.Wait()

	if len(batchErrs) > 0 {
		// errors.Join keeps each batch's classified error reachable via
		// errors.Is, so callers can still distinguish ErrRateLimit from
		// ErrServerError when deciding whether to retry the whole call.
		return allGames, fmt.Errorf("igdb bulk games: %w", errors.Join(batchErrs...))
	}
	return allGames, nil
}

func (s *Service) enrichTimeToBeats(ctx context.Context, data []games.IgdbGame) {
	if len(data) == 0 {
		return
	}

	ids := make([]int, 0, len(data))
	for _, item := range data {
		ids = append(ids, item.ID)
	}

	times, err := unmarshalResponse[[]games.IgdbTimeToBeat](s.client.GetGameTimeToBeats(ctx, ids))
	if err != nil {
		log.Printf("igdb: game time to beat enrichment failed for %v: %v", ids, err)
		for i := range data {
			data[i].TimeToBeatError = true
		}
		return
	}

	byGameID := make(map[int]*games.IgdbTimeToBeat, len(times))
	for i := range times {
		byGameID[times[i].GameID] = &times[i]
	}
	for i := range data {
		data[i].TimeToBeats = byGameID[data[i].ID]
	}
}

func (s *Service) GetPopularGames(ctx context.Context, limit, offset int) ([]models.SearchItem, error) {
	data, err := unmarshalResponse[[]games.IgdbGame](s.client.GetPopularGames(ctx, limit, offset))
	if err != nil {
		return nil, err
	}

	items := make([]models.SearchItem, 0, len(data))
	for _, item := range data {
		// Filter out games that are ONLY on Web browser (ID 82)
		if len(item.Platforms) == 1 && item.Platforms[0].ID == 82 {
			continue
		}
		items = append(items, mapper.MapSearchItem(item))
	}
	return servicecommon.FilterEligibleSearchItems(items, time.Now()), nil
}

func (s *Service) GetRecentGames(ctx context.Context, limit, offset int) ([]models.SearchItem, error) {
	data, err := unmarshalResponse[[]games.IgdbGame](s.client.GetRecentGames(ctx, limit, offset, time.Now()))
	if err != nil {
		return nil, err
	}

	items := make([]models.SearchItem, 0, len(data))
	for _, item := range data {
		if len(item.Platforms) == 1 && item.Platforms[0].ID == 82 {
			continue
		}
		items = append(items, mapper.MapSearchItem(item))
	}
	return servicecommon.FilterEligibleSearchItems(items, time.Now()), nil
}

func (s *Service) GetTrendingGames(ctx context.Context, limit, offset int) ([]models.SearchItem, error) {
	wantMap, visitsMap, err := s.fetchTrendingPrimitives(ctx, limit)

	if err != nil {
		return s.GetPopularGames(ctx, limit, offset)
	}

	games, err := s.resolveGameDetails(ctx, wantMap, visitsMap)
	// Tolerate partial bulk failures: trending is a best-effort surface, and
	// returning N-of-M scored games beats failing the whole homepage bucket
	// because one batch hit a rate limit.
	if err != nil && len(games) == 0 {
		return nil, err
	}
	if err != nil {
		log.Printf("igdb: trending using partial bulk results: %v", err)
	}

	// Filter out games that are ONLY on Web browser
	var filteredGames []models.Game
	for _, game := range games {
		isBrowserOnly := false
		if len(game.Platforms) == 1 && game.Platforms[0].Name == "Web browser" {
			isBrowserOnly = true
		}

		if !isBrowserOnly && servicecommon.IsGeneralReleaseEligible(game.ReleaseDate, time.Now()) {
			filteredGames = append(filteredGames, game)
		}
	}
	games = filteredGames

	scored := s.calculateScores(games, wantMap, visitsMap)
	return paginateAndMap(scored, limit, offset), nil
}

// GetTrendingGamesDetail returns the same trending page as GetTrendingGames
// but already mapped to full Game models. Homepage enrichment uses this to
// avoid a second IGDB GetBulkGames round-trip for the same IDs we just
// scored. The previous flow:
//
//	homepage.fetchTrending -> GetTrendingGames (resolves details to score)
//	homepage.enrichGames   -> GetBulkGames     (re-fetches the same N IDs)
//
// doubled IGDB load on the trending bucket and made hitting the per-second
// IGDB rate limit dramatically more likely.
func (s *Service) GetTrendingGamesDetail(ctx context.Context, limit, offset int) ([]models.Game, error) {
	wantMap, visitsMap, err := s.fetchTrendingPrimitives(ctx, limit)
	if err != nil {
		return nil, err
	}

	games, err := s.resolveGameDetails(ctx, wantMap, visitsMap)
	if err != nil && len(games) == 0 {
		return nil, err
	}
	if err != nil {
		log.Printf("igdb: trending detail using partial bulk results: %v", err)
	}

	filtered := games[:0]
	for _, g := range games {
		if len(g.Platforms) == 1 && g.Platforms[0].Name == "Web browser" {
			continue
		}
		if servicecommon.IsGeneralReleaseEligible(g.ReleaseDate, time.Now()) {
			filtered = append(filtered, g)
		}
	}

	scored := s.calculateScores(filtered, wantMap, visitsMap)
	return paginateScored(scored, limit, offset), nil
}

func unmarshalResponse[T any](resp *clients.Response, err error) (T, error) {
	var zero T
	if err != nil {
		return zero, err
	}

	if cerr := servicecommon.ClassifyStatus("IGDB", resp.StatusCode); cerr != nil {
		return zero, cerr
	}
	var result T
	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return zero, fmt.Errorf("failed to unmarshal IGDB response: %w", err)
	}
	return result, nil
}

func (s *Service) fetchTrendingPrimitives(ctx context.Context, limit int) (map[int]float64, map[int]float64, error) {
	fetchLimit := limit * 4
	if fetchLimit > 500 {
		fetchLimit = 500
	}

	var wantToPlay, visits []games.IgdbPopularityPrimitive
	var errWant, errIncr error
	var wg sync.WaitGroup

	wg.Add(2)
	go func() {
		defer wg.Done()
		wantToPlay, errWant = unmarshalResponse[[]games.IgdbPopularityPrimitive](
			s.client.GetPopularityPrimitives(ctx, PopulationTypeWantToPlay, fetchLimit),
		)
	}()
	go func() {
		defer wg.Done()
		visits, errIncr = unmarshalResponse[[]games.IgdbPopularityPrimitive](
			s.client.GetPopularityPrimitives(ctx, PopulationTypeVisits, fetchLimit),
		)
	}()
	wg.Wait()

	if errWant != nil {
		return nil, nil, errWant
	}

	wantMap := make(map[int]float64)
	for _, p := range wantToPlay {
		wantMap[p.GameID] = p.Value
	}

	visitsMap := make(map[int]float64)
	if errIncr == nil {
		for _, p := range visits {
			visitsMap[p.GameID] = p.Value
		}
	}

	return wantMap, visitsMap, nil
}

func (s *Service) resolveGameDetails(ctx context.Context, wantMap, visitsMap map[int]float64) ([]models.Game, error) {
	idMap := make(map[int]bool)
	for id := range wantMap {
		idMap[id] = true
	}
	for id := range visitsMap {
		idMap[id] = true
	}

	ids := make([]int, 0, len(idMap))
	for id := range idMap {
		ids = append(ids, id)
	}
	sort.Ints(ids)

	return s.GetBulkGames(ctx, ids)
}

func (s *Service) calculateScores(games []models.Game, wantMap, visitsMap map[int]float64) []scoredGame {
	maxWant := findMax(wantMap)
	maxVisits := findMax(visitsMap)
	now := time.Now().Unix()

	var scored []scoredGame
	for _, game := range games {
		score := calculateSingleGameScore(game, wantMap, visitsMap, maxWant, maxVisits, now)
		scored = append(scored, scoredGame{game: game, score: score})
	}

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	return scored
}

func calculateSingleGameScore(game models.Game, wantMap, visitsMap map[int]float64, maxWant, maxVisits float64, now int64) float64 {
	gid, _ := strconv.Atoi(game.ID)

	valWant := 0.0
	if v, ok := wantMap[gid]; ok && maxWant > 0 {
		valWant = v / maxWant
	}

	valVisits := 0.0
	if v, ok := visitsMap[gid]; ok && maxVisits > 0 {
		valVisits = v / maxVisits
	}

	baseScore := 0.0
	if valWant > 0 && valVisits > 0 {
		baseScore = (WeightWantToPlay * valWant) + (WeightVisits * valVisits)
	} else if valWant > 0 {
		baseScore = valWant
	} else if valVisits > 0 {
		baseScore = valVisits
	}

	multiplier := calculateRecencyMultiplier(game.ReleaseDate, now)
	return baseScore * multiplier
}

func calculateRecencyMultiplier(releaseDate *string, now int64) float64 {
	if releaseDate == nil {
		return 1.0
	}

	t, err := time.Parse("2006-01-02", *releaseDate)
	if err != nil {
		return 1.0
	}

	ts := t.Unix()
	if ts > now {
		return 0.0
	}

	nowDate := time.Unix(now, 0).UTC()
	startOfToday := time.Date(nowDate.Year(), nowDate.Month(), nowDate.Day(), 0, 0, 0, 0, time.UTC)
	daysOld := startOfToday.Sub(t).Hours() / 24.0

	switch {
	case daysOld < 30:
		return MaxRecencyBoost
	case daysOld < 60:
		return MaxRecencyBoost * 0.8
	case daysOld < 90:
		return MaxRecencyBoost * 0.6
	case daysOld < 180:
		return MaxRecencyBoost * 0.4
	case daysOld < 365:
		return MaxRecencyBoost * 0.2
	default:
		return 1.0
	}
}

// paginateScored returns the page slice of scored games as full Game models,
// dropping zero-score entries the same way paginateAndMap does so the two
// homepage paths stay in lockstep.
func paginateScored(scored []scoredGame, limit, offset int) []models.Game {
	if offset >= len(scored) {
		return []models.Game{}
	}
	end := offset + limit
	if end > len(scored) {
		end = len(scored)
	}
	subset := scored[offset:end]
	out := make([]models.Game, 0, len(subset))
	for _, s := range subset {
		if s.score <= 0 {
			continue
		}
		out = append(out, s.game)
	}
	return out
}

func paginateAndMap(scored []scoredGame, limit, offset int) []models.SearchItem {
	if offset >= len(scored) {
		return []models.SearchItem{}
	}

	end := offset + limit
	if end > len(scored) {
		end = len(scored)
	}

	subset := scored[offset:end]
	result := make([]models.SearchItem, 0, len(subset))

	for _, s := range subset {
		if s.score <= 0 {
			continue
		}

		result = append(result, models.SearchItem{
			ID:          s.game.ID,
			Type:        s.game.ContentType,
			Title:       s.game.Title,
			Description: s.game.Description,
			ImageURL:    s.game.ImageURL,
			ReleaseDate: s.game.ReleaseDate,
			Authors:     s.game.Authors,
		})
	}

	return result
}

func findMax(m map[int]float64) float64 {
	maxVal := 1.0
	for _, v := range m {
		if v > maxVal {
			maxVal = v
		}
	}
	return maxVal
}
