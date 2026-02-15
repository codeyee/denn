package games

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/models"
	igdbclient "github.com/codeyee/denn-proxy/internal/providers/igdb"
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
	data, err := unmarshalResponse[[]igdbGame](s.client.SearchGames(ctx, query, limit, offset))
	if err != nil {
		return SearchResult{}, err
	}

	items := make([]models.SearchItem, 0, len(data))
	for _, item := range data {
		items = append(items, mapSearchItem(item))
	}

	return SearchResult{Results: items}, nil
}

func (s *Service) GetGameComplete(ctx context.Context, id int) (models.Game, error) {
	data, err := unmarshalResponse[[]igdbGame](s.client.GetGame(ctx, id))
	if err != nil {
		return models.Game{}, err
	}
	if len(data) == 0 {
		return models.Game{}, fmt.Errorf("game not found")
	}

	return mapGame(data[0]), nil
}

func (s *Service) GetBulkGames(ctx context.Context, ids []int) ([]models.Game, error) {
	const batchSize = 10
	var allGames []models.Game
	var mu sync.Mutex
	var wg sync.WaitGroup

	for i := 0; i < len(ids); i += batchSize {
		end := i + batchSize
		if end > len(ids) {
			end = len(ids)
		}
		
		wg.Add(1)
		go func(batchIDs []int) {
			defer wg.Done()
			data, err := unmarshalResponse[[]igdbGame](s.client.GetBulkGames(ctx, batchIDs))
			if err != nil {
				log.Printf("Error fetching bulk games batch: %v", err)
				return
			}
			
			mu.Lock()
			for _, item := range data {
				allGames = append(allGames, mapGame(item))
			}
			mu.Unlock()
		}(ids[i:end])
	}
	
	wg.Wait()
	return allGames, nil
}

func (s *Service) GetPopularGames(ctx context.Context, limit, offset int) ([]models.SearchItem, error) {
	data, err := unmarshalResponse[[]igdbGame](s.client.GetPopularGames(ctx, limit, offset))
	if err != nil {
		return nil, err
	}

	items := make([]models.SearchItem, 0, len(data))
	for _, item := range data {
		// Filter out games that are ONLY on Web browser (ID 82)
		if len(item.Platforms) == 1 && item.Platforms[0].ID == 82 {
			continue
		}
		items = append(items, mapSearchItem(item))
	}
	return items, nil
}

func (s *Service) GetTrendingGames(ctx context.Context, limit, offset int) ([]models.SearchItem, error) {
	wantMap, visitsMap, err := s.fetchTrendingPrimitives(ctx, limit)

	if err != nil {
		return s.GetPopularGames(ctx, limit, offset) 
	}

	games, err := s.resolveGameDetails(ctx, wantMap, visitsMap)

	if err != nil {
		return nil, err
	}
	
	// Filter out games that are ONLY on Web browser
	var filteredGames []models.Game
	for _, game := range games {
		isBrowserOnly := false
		if len(game.Platforms) == 1 && game.Platforms[0].Name == "Web browser" {
			isBrowserOnly = true
		}
		
		if !isBrowserOnly {
			filteredGames = append(filteredGames, game)
		}
	}
	games = filteredGames

	scored := s.calculateScores(games, wantMap, visitsMap)
	return paginateAndMap(scored, limit, offset), nil
}

func unmarshalResponse[T any](resp *clients.Response, err error) (T, error) {
	var zero T
	if err != nil {
		return zero, err
	}
	if resp.StatusCode != 200 {
		return zero, fmt.Errorf("IGDB API error (status %d)", resp.StatusCode)
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

	var wantToPlay, visits []igdbPopularityPrimitive
	var errWant, errIncr error
	var wg sync.WaitGroup

	wg.Add(2)
	go func() {
		defer wg.Done()
		wantToPlay, errWant = unmarshalResponse[[]igdbPopularityPrimitive](
			s.client.GetPopularityPrimitives(ctx, PopulationTypeWantToPlay, fetchLimit),
		)
	}()
	go func() {
		defer wg.Done()
		visits, errIncr = unmarshalResponse[[]igdbPopularityPrimitive](
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

	daysOld := float64(now-ts) / 86400.0

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
