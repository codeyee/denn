package models

type Book struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	ContentType string   `json:"type"`
	Authors     []Author `json:"authors,omitempty"`
	ImageURL    *string  `json:"image_url"`
	ReleaseDate *string  `json:"release_date"`
	Pages       *int     `json:"pages"`
	Description *string  `json:"description"`
	Images      *Images  `json:"-"`
}

type BookResponse struct {
	ID          string       `json:"id"`
	Type        string       `json:"type"`
	Title       string       `json:"title"`
	ImageURL    *string      `json:"image_url"`
	ReleaseDate *string      `json:"release_date"`
	Pages       *int         `json:"pages"`
	Description *string      `json:"description"`
	Authors     []Author     `json:"authors,omitempty"`
	Images      []ImageEntry `json:"images,omitempty"`
}

func (b *Book) ToResponse(imagesSize int) BookResponse {
	resp := BookResponse{
		ID:          b.ID,
		Type:        b.ContentType,
		Title:       b.Title,
		ImageURL:    b.ImageURL,
		ReleaseDate: b.ReleaseDate,
		Pages:       b.Pages,
		Description: b.Description,
		Authors:     b.Authors,
	}

	if b.Images != nil {
		resp.Images = b.Images.ToList(imagesSize)
	}

	return resp
}