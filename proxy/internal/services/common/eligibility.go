package common

import (
	"strings"
	"time"

	"github.com/codeyee/denn-proxy/internal/models"
)

const releaseDateGraceDays = 1

func NormalizeSearchCacheKey(query string) string {
	return strings.ToLower(strings.TrimSpace(query))
}

func IsGeneralReleaseEligible(releaseDate *string, now time.Time) bool {
	releaseAt, ok := parseReleaseDate(releaseDate)
	if !ok {
		return false
	}

	cutoff := now.UTC().AddDate(0, 0, releaseDateGraceDays)
	return !releaseAt.After(cutoff)
}

func FilterEligibleSearchItems(items []models.SearchItem, now time.Time) []models.SearchItem {
	filtered := items[:0]
	for _, item := range items {
		if IsGeneralReleaseEligible(item.ReleaseDate, now) {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

func FilterEligibleMovies(items []models.Movie, now time.Time) []models.Movie {
	filtered := items[:0]
	for _, item := range items {
		if IsGeneralReleaseEligible(item.ReleaseDate, now) {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

func FilterEligibleTVShows(items []models.TVShow, now time.Time) []models.TVShow {
	filtered := items[:0]
	for _, item := range items {
		if IsGeneralReleaseEligible(item.ReleaseDate, now) {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

func FilterValidSeasonSummaries(items []models.Season, now time.Time) []models.Season {
	filtered := items[:0]
	for _, item := range items {
		if IsValidSeasonContent(item, now) {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

func FilterEligibleAlbums(items []models.Album, now time.Time) []models.Album {
	filtered := items[:0]
	for _, item := range items {
		if IsGeneralReleaseEligible(item.ReleaseDate, now) {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

func FilterEligibleBooks(items []models.Book, now time.Time) []models.Book {
	filtered := items[:0]
	for _, item := range items {
		if IsGeneralReleaseEligible(item.ReleaseDate, now) {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

func IsValidSeasonContent(season models.Season, now time.Time) bool {
	if season.SeasonNumber <= 0 || season.NumberOfEpisodes <= 0 {
		return false
	}
	if !IsGeneralReleaseEligible(season.ReleaseDate, now) {
		return false
	}

	if len(season.Episodes) == 0 {
		return true
	}

	validReleasedEpisodes := 0
	for _, episode := range season.Episodes {
		releaseAt, ok := parseReleaseDate(episode.ReleaseDate)
		if !ok {
			continue
		}
		if !releaseAt.After(now.UTC().AddDate(0, 0, releaseDateGraceDays)) {
			validReleasedEpisodes++
		}
	}

	if len(season.Episodes) == 1 && validReleasedEpisodes == 0 {
		return false
	}

	return validReleasedEpisodes > 0
}

func parseReleaseDate(raw *string) (time.Time, bool) {
	if raw == nil || *raw == "" {
		return time.Time{}, false
	}

	layouts := []string{"2006-01-02", "2006-01", "2006"}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, *raw); err == nil {
			return parsed.UTC(), true
		}
	}

	return time.Time{}, false
}
