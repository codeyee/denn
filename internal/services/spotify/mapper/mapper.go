package mapper

import (
	"math"

	"github.com/codeyee/denn-proxy/internal/models"
	"github.com/codeyee/denn-proxy/internal/services/spotify"
)

func getImageURL(images []spotify.SpotifyImage, size string) *string {
	if len(images) == 0 {
		return nil
	}

	switch size {
	case "large":
		return &images[0].URL
	case "medium":
		if len(images) > 1 {
			return &images[1].URL
		}
		return &images[0].URL
	case "small":
		if len(images) > 2 {
			return &images[2].URL
		}
		return &images[0].URL
	default:
		return &images[0].URL
	}
}

func buildImages(images []spotify.SpotifyImage) *models.Images {
	if len(images) == 0 {
		return nil
	}

	posterStandard := getImageURL(images, "medium")
	posterOriginal := getImageURL(images, "large")

	if posterStandard == nil && posterOriginal == nil {
		return nil
	}

	return &models.Images{
		PosterStandard: posterStandard,
		PosterOriginal: posterOriginal,
	}
}

func mapArtists(artists []spotify.SpotifyArtist) []models.Author {
	if len(artists) == 0 {
		return nil
	}

	authors := make([]models.Author, 0, len(artists))
	for _, a := range artists {
		if a.Name != "" {
			authors = append(authors, models.Author{
				Name: a.Name,
				Type: string(models.AuthorTypeArtist),
			})
		}
	}

	if len(authors) == 0 {
		return nil
	}

	return authors
}

func normalizeReleaseDate(date string) *string {
	if date == "" {
		return nil
	}

	switch len(date) {
	case 10: // YYYY-MM-DD
		return &date
	case 7: // YYYY-MM
		normalized := date + "-01"
		return &normalized
	case 4: // YYYY
		normalized := date + "-01-01"
		return &normalized
	default:
		return nil
	}
}

func deriveAlbumType(totalTracks int, durationMinutes *int) string {
	if durationMinutes != nil && *durationMinutes >= 30 {
		return string(models.AlbumTypeAlbum)
	}

	if totalTracks >= 7 {
		return string(models.AlbumTypeAlbum)
	}

	if totalTracks >= 4 && totalTracks <= 6 {
		return string(models.AlbumTypeEP)
	}

	return string(models.AlbumTypeSingle)
}

func toMinutes(totalSeconds int) *int {
	if totalSeconds <= 0 {
		return nil
	}
	m := int(math.Round(float64(totalSeconds) / 60))
	return &m
}

func mapTrack(t spotify.SpotifyTrack) models.Track {
	var durationSeconds *int
	if t.DurationMs > 0 {
		s := int(math.Round(float64(t.DurationMs) / 1000))
		durationSeconds = &s
	}

	var externalURL *string
	if t.ExternalURLs.Spotify != "" {
		url := t.ExternalURLs.Spotify
		externalURL = &url
	}

	return models.Track{
		ID:              t.ID,
		Title:           t.Name,
		TrackNumber:     t.TrackNumber,
		Authors:         mapArtists(t.Artists),
		DurationSeconds: durationSeconds,
		ExternalURL:     externalURL,
	}
}

func MapSearchItem(item spotify.SpotifyAlbum) models.SearchItem {
	return models.SearchItem{
		ID:          item.ID,
		Type:        string(models.ContentTypeAlbum),
		Title:       item.Name,
		Authors:     mapArtists(item.Artists),
		ImageURL:    getImageURL(item.Images, "large"),
		ReleaseDate: normalizeReleaseDate(item.ReleaseDate),
	}
}

func MapAlbumDetail(data spotify.SpotifyAlbum) models.Album {
	var tracks []models.Track
	var totalDurationSeconds int

	if data.Tracks != nil {
		tracks = make([]models.Track, 0, len(data.Tracks.Items))
		for _, t := range data.Tracks.Items {
			track := mapTrack(t)
			tracks = append(tracks, track)
			if track.DurationSeconds != nil {
				totalDurationSeconds += *track.DurationSeconds
			}
		}
	}

	durationMinutes := toMinutes(totalDurationSeconds)
	albumType := deriveAlbumType(data.TotalTracks, durationMinutes)

	var externalURL *string
	if data.ExternalURLs.Spotify != "" {
		url := data.ExternalURLs.Spotify
		externalURL = &url
	}

	return models.Album{
		ID:              data.ID,
		Title:           data.Name,
		ContentType:     string(models.ContentTypeAlbum),
		Authors:         mapArtists(data.Artists),
		ImageURL:        getImageURL(data.Images, "large"),
		ReleaseDate:     normalizeReleaseDate(data.ReleaseDate),
		TotalTracks:     &data.TotalTracks,
		DurationMinutes: durationMinutes,
		AlbumType:       &albumType,
		ExternalURL:     externalURL,
		Images:          buildImages(data.Images),
		Tracks:          tracks,
	}
}
