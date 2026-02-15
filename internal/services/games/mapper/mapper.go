package mapper

import (
	"fmt"
	"regexp"
	"strconv"
	"time"

	"github.com/codeyee/denn-proxy/internal/models"
	"github.com/codeyee/denn-proxy/internal/services/games"
)

const (
	igdbImageBaseURL = "https://images.igdb.com/igdb/image/upload"

	GameTypeOriginal            = "original"
	GameTypeStandaloneExpansion = "standalone_expansion"
	GameTypeRemake              = "remake"
	GameTypeRemaster            = "remaster"
)

var gameTypeMap = map[int]string{
	0: GameTypeOriginal,
	4: GameTypeStandaloneExpansion,
	8: GameTypeRemake,
	9: GameTypeRemaster,
}

func buildIgdbImageURL(imageID, size string) *string {
	if imageID == "" {
		return nil
	}

	url := fmt.Sprintf("%s/t_%s/%s.jpg", igdbImageBaseURL, size, imageID)
	return &url
}

var imageIDRegex = regexp.MustCompile(`/([^/]+)\.jpg$`)

func extractImageID(url string) string {
	if url == "" {
		return ""
	}

	matches := imageIDRegex.FindStringSubmatch(url)
	if len(matches) > 1 {
		return matches[1]
	}

	return ""
}

func formatReleaseDate(timestamp int64) *string {
	if timestamp == 0 {
		return nil
	}

	t := time.Unix(timestamp, 0).UTC()
	s := t.Format("2006-01-02")
	return &s
}

func formatGameType(category int) *string {
	if t, ok := gameTypeMap[category]; ok {
		return &t
	}

	return nil
}

func buildDescription(summary, storyline string) *string {
	if summary == "" && storyline == "" {
		return nil
	}

	if summary != "" && storyline != "" {
		s := summary + "\n\n" + storyline
		return &s
	}

	if summary != "" {
		return &summary
	}

	return &storyline
}

func getImageIDFromCover(cover games.IgdbImage) string {
	if cover.ImageID != "" {
		return cover.ImageID
	}

	if cover.Url != "" {
		return extractImageID(cover.Url)
	}

	return ""
}

func buildImages(item games.IgdbGame) *models.Images {
	posterID := getImageIDFromCover(item.Cover)

	posterStandard := buildIgdbImageURL(posterID, "720p")
	posterOriginal := buildIgdbImageURL(posterID, "1080p")

	var additionalGalleries []models.GalleryItem

	for i, s := range item.Screenshots {
		if i >= 4 {
			break
		}

		imgID := s.ImageID

		if imgID == "" {
			imgID = extractImageID(s.Url)
		}

		if imgID != "" {
			std := buildIgdbImageURL(imgID, "1080p")

			if std != nil {
				additionalGalleries = append(additionalGalleries, models.GalleryItem{
					Standard: *std,
					Original: *std,
				})
			}
		}
	}

	for i, a := range item.Artworks {
		if i >= 4 {
			break
		}

		imgID := a.ImageID

		if imgID == "" {
			imgID = extractImageID(a.Url)
		}

		if imgID != "" {
			std := buildIgdbImageURL(imgID, "1080p")

			if std != nil {
				additionalGalleries = append(additionalGalleries, models.GalleryItem{
					Standard: *std,
					Original: *std,
				})
			}
		}
	}

	if len(additionalGalleries) > 4 {
		additionalGalleries = additionalGalleries[:4]
	}

	var galleryStandard, galleryOriginal *string
	if len(item.Screenshots) > 0 {
		first := item.Screenshots[0]
		imgID := first.ImageID

		if imgID == "" {
			imgID = extractImageID(first.Url)
		}

		if imgID != "" {
			galleryStandard = buildIgdbImageURL(imgID, "screenshot_huge")
			galleryOriginal = buildIgdbImageURL(imgID, "1080p")
		}
	}

	return &models.Images{
		PosterStandard:      posterStandard,
		PosterOriginal:      posterOriginal,
		GalleryStandard:     galleryStandard,
		GalleryOriginal:     galleryOriginal,
		AdditionalGalleries: additionalGalleries,
	}
}

func extractPlatforms(platforms []games.IgdbPlatform) []models.Platform {
	if len(platforms) == 0 {
		return nil
	}

	res := make([]models.Platform, 0, len(platforms))

	for _, p := range platforms {
		res = append(res, models.Platform{
			Name:     p.Name,
			ImageURL: getPlatformLogo(p.PlatformLogo),
		})
	}

	return res
}

func extractAuthors(companies []games.IgdbInvolvedCompany) []models.Author {
	var authors []models.Author

	for _, c := range companies {
		if c.Developer && c.Company.Name != "" {
			authors = append(authors, models.Author{
				Name: c.Company.Name,
				Type: string(models.AuthorTypeDeveloper),
			})
		}
	}

	if len(authors) == 0 {
		return nil
	}

	return authors
}

func extractNames[T any](items []T, nameFn func(T) string) []string {
	if len(items) == 0 {
		return nil
	}
	names := make([]string, 0, len(items))
	for _, item := range items {
		if name := nameFn(item); name != "" {
			names = append(names, name)
		}
	}
	return names
}

func extractSeries(collections []games.IgdbCollection, franchises []games.IgdbFranchise) *string {
	if len(franchises) > 0 {
		return &franchises[0].Name
	}

	if len(collections) > 0 {
		return &collections[0].Name
	}

	return nil
}

func extractPlayTime(tb *games.IgdbTimeToBeat) *models.PlayTime {
	if tb == nil {
		return nil
	}

	return &models.PlayTime{
		Hastily:    tb.Hastily,
		Normally:   tb.Normally,
		Completely: tb.Completely,
	}
}

func MapSearchItem(game games.IgdbGame) models.SearchItem {
	return models.SearchItem{
		ID:          strconv.Itoa(game.ID),
		Type:        string(models.ContentTypeGame),
		Title:       game.Name,
		Description: buildDescription(game.Summary, game.Storyline),
		ImageURL:    getImageURL(game.Cover),
		ReleaseDate: formatReleaseDate(game.FirstReleaseDate),
		Authors:     extractAuthors(game.InvolvedCompanies),
	}
}

func MapGame(item games.IgdbGame) models.Game {
	posterID := getImageIDFromCover(item.Cover)

	return models.Game{
		ID:          strconv.Itoa(item.ID),
		Title:       item.Name,
		ContentType: string(models.ContentTypeGame),
		Description: buildDescription(item.Summary, item.Storyline),
		ImageURL:    buildIgdbImageURL(posterID, "720p"),
		GameType:    formatGameType(item.GameType),
		ReleaseDate: formatReleaseDate(item.FirstReleaseDate),
		Authors:     extractAuthors(item.InvolvedCompanies),
		Platforms:   extractPlatforms(item.Platforms),
		Images:      buildImages(item),

		Genres:    extractNames(item.Genres, func(g games.IgdbGenre) string { return g.Name }),
		Themes:    extractNames(item.Themes, func(t games.IgdbTheme) string { return t.Name }),
		GameModes: extractNames(item.GameModes, func(m games.IgdbGameMode) string { return m.Name }),
		Series:    extractSeries(item.Collections, item.Franchises),

		PlayTime: extractPlayTime(item.TimeToBeats),
	}
}

func getImageURL(img games.IgdbImage) *string {
	if img.Url != "" {
		if img.ImageID != "" {
			url := fmt.Sprintf("https://images.igdb.com/igdb/image/upload/t_cover_big/%s.jpg", img.ImageID)
			return &url
		}
		// IGDB URLs often start with //
		url := "https:" + img.Url
		return &url
	}
	return nil
}

func getBackdropURL(screenshots, artworks []games.IgdbImage) *string {
	if len(screenshots) > 0 && screenshots[0].ImageID != "" {
		url := fmt.Sprintf("https://images.igdb.com/igdb/image/upload/t_screenshot_big/%s.jpg", screenshots[0].ImageID)
		return &url
	}
	if len(artworks) > 0 && artworks[0].ImageID != "" {
		url := fmt.Sprintf("https://images.igdb.com/igdb/image/upload/t_screenshot_big/%s.jpg", artworks[0].ImageID)
		return &url
	}
	return nil
}

func getReleaseDate(ts int64) *string {
	if ts == 0 {
		return nil
	}
	t := time.Unix(ts, 0)
	s := t.Format("2006-01-02")
	return &s
}

func getPlatformLogo(logo games.IgdbPlatformLogo) *string {
	if logo.ImageID != "" {
		url := fmt.Sprintf("https://images.igdb.com/igdb/image/upload/t_thumb/%s.jpg", logo.ImageID)
		return &url
	}
	return nil
}
