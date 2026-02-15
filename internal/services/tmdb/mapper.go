package tmdb

import (
	"strings"

	"github.com/codeyee/denn-proxy/internal/models"
)

func buildImageURL(path, size string) string {
	return imageBaseURL + size + path
}

func buildImageURLPtr(path *string, size string) *string {
	if path == nil || *path == "" {
		return nil
	}

	url := buildImageURL(*path, size)
	return &url
}

func buildImages(posterPath, backdropPath *string, imagesData *tmdbImagesResponse) *models.Images {
	img := &models.Images{
		PosterStandard:  buildImageURLPtr(posterPath, posterSizeStandard),
		PosterOriginal:  buildImageURLPtr(posterPath, posterSizeOriginal),

		GalleryStandard: buildImageURLPtr(backdropPath, gallerySizeStandard),
		GalleryOriginal: buildImageURLPtr(backdropPath, gallerySizeOriginal),
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
				Standard: buildImageURL(backdrop.FilePath, gallerySizeStandard),
				Original: buildImageURL(backdrop.FilePath, gallerySizeOriginal),
			})
		}
	}

	return img
}

func normalizePlatforms(wpData *tmdbWatchProvidersResponse, country string) map[string][]models.Platform {
	if wpData == nil || wpData.Results == nil {
		return nil
	}

	countryData, ok := wpData.Results[country]

	if !ok {
		return nil
	}

	result := make(map[string][]models.Platform)

	addProviders := func(action string, providers []tmdbProvider) {
		if len(providers) == 0 {
			return
		}

		platforms := make([]models.Platform, 0, len(providers))
		for _, p := range providers {
			var logoURL *string
			if p.LogoPath != "" {
				u := buildImageURL(p.LogoPath, posterSizeStandard)
				logoURL = &u
			}

			platforms = append(platforms, models.Platform{
				Name:     p.ProviderName,
				ImageURL: logoURL,
			})
		}

		result[action] = platforms
	}

	addProviders(ProviderActionStream, countryData.Flatrate)
	addProviders(ProviderActionRent, countryData.Rent)
	addProviders(ProviderActionBuy, countryData.Buy)

	if len(result) == 0 {
		return nil
	}

	return result
}

func extractAuthors(companies []tmdbCompany) []models.Author {
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

func isValidSeason(s tmdbSeasonSummary) bool {
	return s.SeasonNumber > 0 && s.EpisodeCount > 0
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}

	return &s
}

func mapSearchItemMovie(r tmdbSearchResult) models.SearchItem {
	return models.SearchItem{
		ID:            r.ID,
		Type:          string(models.ContentTypeMovie),
		Title:         r.Title,
		OriginalTitle: strPtr(r.OriginalTitle),
		Description:   strPtr(r.Overview),
		ImageURL:      buildImageURLPtr(r.PosterPath, posterSizeStandard),
		ReleaseDate:   strPtr(r.ReleaseDate),
	}
}

func mapSearchItemTV(r tmdbSearchResult) models.SearchItem {
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
		ID:            r.ID,
		Type:          string(models.ContentTypeTVShow),
		Title:         title,
		OriginalTitle: strPtr(originalTitle),
		Description:   strPtr(r.Overview),
		ImageURL:      buildImageURLPtr(r.PosterPath, posterSizeStandard),
		ReleaseDate:   strPtr(releaseDate),
	}
}

func mapMovie(d tmdbMovieDetail, country string) models.Movie {
	return models.Movie{
		ID:              d.ID,
		Title:           d.Title,
		OriginalTitle:   d.OriginalTitle,
		ContentType:     string(models.ContentTypeMovie),
		Description:     strPtr(d.Overview),
		ImageURL:        buildImageURLPtr(d.PosterPath, posterSizeStandard),
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

func mapTVShow(d tmdbTVDetail, country string) models.TVShow {
	return models.TVShow{
		ID:               d.ID,
		Title:            d.Name,
		OriginalTitle:    d.OriginalName,
		ContentType:      string(models.ContentTypeTVShow),
		Description:      strPtr(d.Overview),
		ImageURL:         buildImageURLPtr(d.PosterPath, posterSizeStandard),
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

func mapSeason(d tmdbSeasonDetail, tvShowName string, images *tmdbImagesResponse, platforms *tmdbWatchProvidersResponse, country string) models.Season {
	episodes := make([]models.Episode, 0, len(d.Episodes))
	for _, ep := range d.Episodes {
		episodes = append(episodes, mapEpisode(ep))
	}

	return models.Season{
		ID:               d.ID,
		SeasonNumber:     d.SeasonNumber,
		Title:            d.Name,
		ContentType:      string(models.ContentTypeSeason),
		NumberOfEpisodes: len(d.Episodes),
		Description:      strPtr(d.Overview),
		ReleaseDate:      strPtr(d.AirDate),
		ImageURL:         buildImageURLPtr(d.PosterPath, posterSizeStandard),
		TVShowName:       strPtr(tvShowName),
		Images:           buildImages(d.PosterPath, nil, images),
		Episodes:         episodes,
		Platforms:        normalizePlatforms(platforms, country),
	}
}

func mapSeasonSummary(s tmdbSeasonSummary) models.Season {
	return models.Season{
		ID:               s.ID,
		SeasonNumber:     s.SeasonNumber,
		Title:            s.Name,
		ContentType:      string(models.ContentTypeSeason),
		NumberOfEpisodes: s.EpisodeCount,
		Description:      strPtr(s.Overview),
		ReleaseDate:      strPtr(s.AirDate),
		ImageURL:         buildImageURLPtr(s.PosterPath, posterSizeStandard),
	}
}

func mapEpisode(ep tmdbEpisode) models.Episode {
	return models.Episode{
		ID:              ep.ID,
		EpisodeNumber:   ep.EpisodeNumber,
		SeasonNumber:    ep.SeasonNumber,
		Title:           ep.Name,
		Description:     strPtr(ep.Overview),
		ReleaseDate:     strPtr(ep.AirDate),
		DurationMinutes: ep.Runtime,
		ImageURL:        buildImageURLPtr(ep.StillPath, gallerySizeStandard),
		EpisodeType:     strPtr(ep.EpisodeType),
	}
}

func extractImdbID(ext *tmdbExternalIDsResponse) *string {
	if ext == nil {
		return nil
	}

	return ext.ImdbID
}