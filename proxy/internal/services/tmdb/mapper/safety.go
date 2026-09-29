package mapper

import (
	"strings"

	"github.com/codeyee/denn-proxy/internal/models"
	servicecommon "github.com/codeyee/denn-proxy/internal/services/common"
	"github.com/codeyee/denn-proxy/internal/services/tmdb"
)

// MapMovieDetail is MapMovie plus the provider safety metadata that only the
// detail request asks TMDB for. Preview cards keep using MapMovie so they stay
// unchanged.
func MapMovieDetail(d tmdb.TmdbMovieDetail, country string) models.Movie {
	movie := MapMovie(d, country)
	movie.Adult = d.Adult
	movie.Genres = genreNames(d.Genres)
	movie.Certifications = movieCertifications(d.ReleaseDates)

	if d.Keywords != nil {
		movie.Keywords = keywordNames(d.Keywords.Keywords)
	}

	return movie
}

// MapTVShowDetail is the TV equivalent of MapMovieDetail.
func MapTVShowDetail(d tmdb.TmdbTVDetail, country string) models.TVShow {
	show := MapTVShow(d, country)
	show.Adult = d.Adult
	show.Genres = genreNames(d.Genres)
	show.Certifications = tvCertifications(d.ContentRatings)

	if d.Keywords != nil {
		show.Keywords = keywordNames(d.Keywords.Results)
	}

	return show
}

func genreNames(genres []tmdb.TmdbGenre) []string {
	names := make([]string, 0, len(genres))
	for _, g := range genres {
		names = append(names, g.Name)
	}

	return servicecommon.UniqueTrimmed(names)
}

func keywordNames(keywords []tmdb.TmdbKeyword) []string {
	names := make([]string, 0, len(keywords))
	for _, k := range keywords {
		names = append(names, k.Name)
	}

	return servicecommon.UniqueTrimmed(names)
}

// movieCertifications keeps one certification per country: the first
// non-empty theatrical (type 3) certification, otherwise the first non-empty
// one of any release type.
func movieCertifications(data *tmdb.TmdbReleaseDatesResponse) []models.Certification {
	if data == nil {
		return nil
	}

	var certifications []models.Certification
	seen := make(map[string]struct{}, len(data.Results))

	for _, entry := range data.Results {
		country := strings.TrimSpace(entry.Country)
		rating := pickReleaseCertification(entry.ReleaseDates)

		if country == "" || rating == "" {
			continue
		}
		if _, duplicate := seen[country]; duplicate {
			continue
		}
		seen[country] = struct{}{}

		certifications = append(certifications, models.Certification{Country: country, Rating: rating})
	}

	return certifications
}

func pickReleaseCertification(releases []tmdb.TmdbReleaseDate) string {
	anyType := ""

	for _, release := range releases {
		certification := strings.TrimSpace(release.Certification)
		if certification == "" {
			continue
		}
		if release.Type == tmdb.ReleaseTypeTheatrical {
			return certification
		}
		if anyType == "" {
			anyType = certification
		}
	}

	return anyType
}

func tvCertifications(data *tmdb.TmdbContentRatingsResponse) []models.Certification {
	if data == nil {
		return nil
	}

	var certifications []models.Certification
	seen := make(map[models.Certification]struct{}, len(data.Results))

	for _, entry := range data.Results {
		certification := models.Certification{
			Country: strings.TrimSpace(entry.Country),
			Rating:  strings.TrimSpace(entry.Rating),
		}

		if certification.Country == "" || certification.Rating == "" {
			continue
		}
		if _, duplicate := seen[certification]; duplicate {
			continue
		}
		seen[certification] = struct{}{}

		certifications = append(certifications, certification)
	}

	return certifications
}
