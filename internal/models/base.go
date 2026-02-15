package models

type Author struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type Platform struct {
	Name     string  `json:"name"`
	ImageURL *string `json:"image_url"`
}

type ImageEntry struct {
	Type     ImageType `json:"type"`
	Size     ImageSize `json:"size"`
	ImageURL string    `json:"image_url"`
}

type GalleryItem struct {
	Standard string
	Original string
}

type Images struct {
	PosterStandard      *string
	PosterOriginal      *string
	GalleryStandard     *string
	GalleryOriginal     *string
	AdditionalGalleries []GalleryItem
	AdditionalURLs      []string
}

func (img *Images) ToList(imagesSize int) []ImageEntry {
	if img == nil {
		return nil
	}

	images := make([]ImageEntry, 0, imagesSize)

	if img.PosterStandard != nil {
		images = append(images, ImageEntry{
			Type:     ImageTypePoster,
			Size:     ImageSizeStandard,
			ImageURL: *img.PosterStandard,
		})
	}

	if img.PosterOriginal != nil {
		images = append(images, ImageEntry{
			Type:     ImageTypePoster,
			Size:     ImageSizeOriginal,
			ImageURL: *img.PosterOriginal,
		})
	}

	if img.GalleryStandard != nil {
		images = append(images, ImageEntry{
			Type:     ImageTypeGallery,
			Size:     ImageSizeStandard,
			ImageURL: *img.GalleryStandard,
		})
	}

	if img.GalleryOriginal != nil {
		images = append(images, ImageEntry{
			Type:     ImageTypeGallery,
			Size:     ImageSizeOriginal,
			ImageURL: *img.GalleryOriginal,
		})
	}

	for _, item := range img.AdditionalGalleries {
		if len(images) >= imagesSize {
			break
		}

		if item.Standard != "" && len(images) < imagesSize {
			images = append(images, ImageEntry{
				Type:     ImageTypeGallery,
				Size:     ImageSizeStandard,
				ImageURL: item.Standard,
			})
		}

		if item.Original != "" && len(images) < imagesSize {
			images = append(images, ImageEntry{
				Type:     ImageTypeGallery,
				Size:     ImageSizeOriginal,
				ImageURL: item.Original,
			})
		}
	}

	for _, url := range img.AdditionalURLs {
		if len(images) >= imagesSize {
			break
		}

		images = append(images, ImageEntry{
			Type:     ImageTypeGallery,
			Size:     ImageSizeOriginal,
			ImageURL: url,
		})
	}

	if len(images) > imagesSize {
		images = images[:imagesSize]
	}

	return images
}

type SearchItem struct {
	ID            string   `json:"id"`
	Type          string   `json:"type"`
	Title         string   `json:"title"`
	OriginalTitle *string  `json:"original_title,omitempty"`
	Description   *string  `json:"description"`
	ImageURL      *string  `json:"image_url"`
	ReleaseDate   *string  `json:"release_date"`
	Authors       []Author `json:"authors,omitempty"`
}
