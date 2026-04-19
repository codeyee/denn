package mapper

import (
	"strconv"
	"strings"

	"github.com/codeyee/denn-proxy/internal/models"
	"github.com/codeyee/denn-proxy/internal/services/tmdb"
)

func buildImageURL(path, size string) string {
	return tmdb.ImageBaseURL + size + path
}

func buildImageURLPtr(path *string, size string) *string {
	if path == nil || *path == "" {
		return nil
	}

	url := buildImageURL(*path, size)
	return &url
}

func buildImages(posterPath, backdropPath *string, imagesData *tmdb.TmdbImagesResponse) *models.Images {
	img := &models.Images{
		PosterStandard: buildImageURLPtr(posterPath, tmdb.PosterSizeStandard),
		PosterOriginal: buildImageURLPtr(posterPath, tmdb.PosterSizeOriginal),

		GalleryStandard: buildImageURLPtr(backdropPath, tmdb.GallerySizeStandard),
		GalleryOriginal: buildImageURLPtr(backdropPath, tmdb.GallerySizeOriginal),
	}

	if imagesData != nil {
		for _, backdrop := range imagesData.Backdrops {
			if backdrop.FilePath == "" {
				continue
			}

			if backdropPath != nil && backdrop.FilePath == *backdropPath {
				continue
			}

			img.AdditionalGalleries = append(img.AdditionalGalleries, models.GalleryItem{
				Standard: buildImageURL(backdrop.FilePath, tmdb.GallerySizeStandard),
				Original: buildImageURL(backdrop.FilePath, tmdb.GallerySizeOriginal),
			})
		}
	}

	return img
}

func normalizePlatforms(wpData *tmdb.TmdbWatchProvidersResponse, country string) map[string][]models.Platform {
	if wpData == nil || wpData.Results == nil {
		return nil
	}

	countryData, ok := wpData.Results[country]

	if !ok {
		return nil
	}

	result := make(map[string][]models.Platform)

	addProviders := func(action string, providers []tmdb.TmdbProvider) {
		if len(providers) == 0 {
			return
		}

		platforms := make([]models.Platform, 0, len(providers))
		for _, p := range providers {
			var logoURL *string
			if p.LogoPath != "" {
				u := buildImageURL(p.LogoPath, tmdb.PosterSizeStandard)
				logoURL = &u
			}

			platforms = append(platforms, models.Platform{
				Name:     p.ProviderName,
				ImageURL: logoURL,
			})
		}

		result[action] = platforms
	}

	addProviders(tmdb.ProviderActionStream, countryData.Flatrate)
	addProviders(tmdb.ProviderActionRent, countryData.Rent)
	addProviders(tmdb.ProviderActionBuy, countryData.Buy)

	if len(result) == 0 {
		return nil
	}

	return result
}

func extractAuthors(companies []tmdb.TmdbCompany) []models.Author {
	if len(companies) == 0 {
		return nil
	}

	authors := make([]models.Author, 0, len(companies))

	for _, c := range companies {
		authors = append(authors, models.Author{
			Name: c.Name,
			Type: string(models.AuthorTypeProducer),
		})
	}

	return authors
}

func IsValidSeason(s tmdb.TmdbSeasonSummary) bool {
	return s.SeasonNumber > 0 && s.EpisodeCount > 0
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}

	return &s
}

func MapSearchItemMovie(r tmdb.TmdbSearchResult) models.SearchItem {
	return models.SearchItem{
		ID:            strconv.Itoa(r.ID),
		Type:          string(models.ContentTypeMovie),
		Title:         r.Title,
		OriginalTitle: strPtr(r.OriginalTitle),
		Description:   strPtr(r.Overview),
		ImageURL:      buildImageURLPtr(r.PosterPath, tmdb.PosterSizeStandard),
		ReleaseDate:   strPtr(r.ReleaseDate),
	}
}

func MapSearchItemTV(r tmdb.TmdbSearchResult) models.SearchItem {
	title := r.Name

	if title == "" {
		title = r.Title
	}

	originalTitle := r.OriginalName

	if originalTitle == "" {
		originalTitle = r.OriginalTitle
	}

	releaseDate := r.FirstAirDate

	if releaseDate == "" {
		releaseDate = r.ReleaseDate
	}

	return models.SearchItem{
		ID:            strconv.Itoa(r.ID),
		Type:          string(models.ContentTypeTVShow),
		Title:         title,
		OriginalTitle: strPtr(originalTitle),
		Description:   strPtr(r.Overview),
		ImageURL:      buildImageURLPtr(r.PosterPath, tmdb.PosterSizeStandard),
		ReleaseDate:   strPtr(releaseDate),
	}
}

func MapMovie(d tmdb.TmdbMovieDetail, country string) models.Movie {
	return models.Movie{
		ID:              strconv.Itoa(d.ID),
		Title:           d.Title,
		OriginalTitle:   d.OriginalTitle,
		ContentType:     string(models.ContentTypeMovie),
		Description:     strPtr(d.Overview),
		ImageURL:        buildImageURLPtr(d.PosterPath, tmdb.PosterSizeStandard),
		Tagline:         strPtr(d.Tagline),
		ImdbID:          extractImdbID(d.ExternalIDs),
		ReleaseDate:     strPtr(d.ReleaseDate),
		DurationMinutes: d.Runtime,
		Status:          strPtr(strings.ToLower(d.Status)),
		Authors:         extractAuthors(d.ProductionCompanies),
		Images:          buildImages(d.PosterPath, d.BackdropPath, d.Images),
		Platforms:       normalizePlatforms(d.WatchProviders, country),
	}
}

func MapTVShow(d tmdb.TmdbTVDetail, country string) models.TVShow {
	return models.TVShow{
		ID:               strconv.Itoa(d.ID),
		Title:            d.Name,
		OriginalTitle:    d.OriginalName,
		ContentType:      string(models.ContentTypeTVShow),
		Description:      strPtr(d.Overview),
		ImageURL:         buildImageURLPtr(d.PosterPath, tmdb.PosterSizeStandard),
		Tagline:          strPtr(d.Tagline),
		ImdbID:           extractImdbID(d.ExternalIDs),
		ReleaseDate:      strPtr(d.FirstAirDate),
		Status:           strPtr(strings.ToLower(d.Status)),
		NumberOfSeasons:  d.NumberOfSeasons,
		NumberOfEpisodes: d.NumberOfEpisodes,
		Authors:          extractAuthors(d.ProductionCompanies),
		Images:           buildImages(d.PosterPath, d.BackdropPath, d.Images),
		Platforms:        normalizePlatforms(d.WatchProviders, country),
	}
}

func MapSeason(d tmdb.TmdbSeasonDetail, tvShowName string, images *tmdb.TmdbImagesResponse, platforms *tmdb.TmdbWatchProvidersResponse, country string) models.Season {
	episodes := make([]models.Episode, 0, len(d.Episodes))
	for _, ep := range d.Episodes {
		episodes = append(episodes, MapEpisode(ep))
	}

	return models.Season{
		ID:               strconv.Itoa(d.ID),
		SeasonNumber:     d.SeasonNumber,
		Title:            d.Name,
		ContentType:      string(models.ContentTypeSeason),
		NumberOfEpisodes: len(d.Episodes),
		Description:      strPtr(d.Overview),
		ReleaseDate:      strPtr(d.AirDate),
		ImageURL:         buildImageURLPtr(d.PosterPath, tmdb.PosterSizeStandard),
		TVShowName:       strPtr(tvShowName),
		Images:           buildImages(d.PosterPath, nil, images),
		Episodes:         episodes,
		Platforms:        normalizePlatforms(platforms, country),
	}
}

func MapSeasonSummary(s tmdb.TmdbSeasonSummary) models.Season {
	return models.Season{
		ID:               strconv.Itoa(s.ID),
		SeasonNumber:     s.SeasonNumber,
		Title:            s.Name,
		ContentType:      string(models.ContentTypeSeason),
		NumberOfEpisodes: s.EpisodeCount,
		Description:      strPtr(s.Overview),
		ReleaseDate:      strPtr(s.AirDate),
		ImageURL:         buildImageURLPtr(s.PosterPath, tmdb.PosterSizeStandard),
	}
}

func MapEpisode(ep tmdb.TmdbEpisode) models.Episode {
	return models.Episode{
		ID:              strconv.Itoa(ep.ID),
		EpisodeNumber:   ep.EpisodeNumber,
		SeasonNumber:    ep.SeasonNumber,
		Title:           ep.Name,
		Description:     strPtr(ep.Overview),
		ReleaseDate:     strPtr(ep.AirDate),
		DurationMinutes: ep.Runtime,
		ImageURL:        buildImageURLPtr(ep.StillPath, tmdb.GallerySizeStandard),
		EpisodeType:     strPtr(ep.EpisodeType),
	}
}

func extractImdbID(ext *tmdb.TmdbExternalIDsResponse) *string {
	if ext == nil {
		return nil
	}

	return ext.ImdbID
}
