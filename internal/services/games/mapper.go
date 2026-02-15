package games

import (
	"fmt"
	"regexp"
	"strconv"
	"time"

	"github.com/codeyee/denn-proxy/internal/models"
)

const (
	igdbImageBaseURL   = "https://images.igdb.com/igdb/image/upload"
	
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

func getImageIDFromCover(cover igdbImage) string {
	if cover.ImageID != "" {
		return cover.ImageID
	}

	if cover.Url != "" {
		return extractImageID(cover.Url)
	}

	return ""
}

func buildImages(item igdbGame) *models.Images {
	posterID := getImageIDFromCover(item.Cover)
	
	posterStandard := buildIgdbImageURL(posterID, "720p")
	posterOriginal := buildIgdbImageURL(posterID, "1080p")
	
	var additionalGalleries []models.GalleryItem
	
	for i, s := range item.Screenshots {
		if i >= 4 { break }

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
		if i >= 4 { break }

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

func extractPlatforms(platforms []igdbPlatform) []models.Platform {
	if len(platforms) == 0 {
		return nil
	}
	
	res := make([]models.Platform, 0, len(platforms))

	for _, p := range platforms {
		var imgURL *string

		if p.PlatformLogo.ImageID != "" {
			imgURL = buildIgdbImageURL(p.PlatformLogo.ImageID, "cover_small")
		}

		res = append(res, models.Platform{
			Name:     p.Name,
			ImageURL: imgURL,
		})
	}
	
	return res
}

func extractAuthors(companies []igdbInvolvedCompany) []models.Author {
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

func mapSearchItem(item igdbGame) models.SearchItem {
	posterID := getImageIDFromCover(item.Cover)
	
	return models.SearchItem{
		ID:            strconv.Itoa(item.ID),
		Type:          string(models.ContentTypeGame),
		Title:         item.Name,
		OriginalTitle: nil,
		Description:   buildDescription(item.Summary, item.Storyline),
		ImageURL:      buildIgdbImageURL(posterID, "720p"),
		ReleaseDate:   formatReleaseDate(item.FirstReleaseDate),
		Authors:       extractAuthors(item.InvolvedCompanies),
	}
}

func mapGame(item igdbGame) models.Game {
	posterID := getImageIDFromCover(item.Cover)
	
	return models.Game{
		ID:          strconv.Itoa(item.ID),
		Title:       item.Name,
		ContentType: string(models.ContentTypeGame),
		Description: buildDescription(item.Summary, item.Storyline),
		ImageURL:    buildIgdbImageURL(posterID, "720p"),
		GameType:    formatGameType(item.Category),
		ReleaseDate: formatReleaseDate(item.FirstReleaseDate),
		Authors:     extractAuthors(item.InvolvedCompanies),
		Platforms:   extractPlatforms(item.Platforms),
		Images:      buildImages(item),
	}
}
