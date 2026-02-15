package models

type Game struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	ContentType string     `json:"type"`
	Description *string    `json:"description"`
	ImageURL    *string    `json:"image_url"`
	GameType    *string    `json:"game_type"`
	ReleaseDate *string    `json:"release_date"`
	Authors     []Author   `json:"authors,omitempty"`
	Platforms   []Platform `json:"platforms,omitempty"`
	Images      *Images    `json:"-"`
}

type GameResponse struct {
	ID          string       `json:"id"`
	Type        string       `json:"type"`
	Title       string       `json:"title"`
	GameType    *string      `json:"game_type"`
	Description *string      `json:"description"`
	ImageURL    *string      `json:"image_url"`
	ReleaseDate *string      `json:"release_date"`
	Authors     []Author     `json:"authors,omitempty"`
	Platforms   []Platform   `json:"platforms,omitempty"`
	Images      []ImageEntry `json:"images,omitempty"`
}

func (g *Game) ToResponse(imagesSize int) GameResponse {
	resp := GameResponse{
		ID:          g.ID,
		Type:        g.ContentType,
		Title:       g.Title,
		GameType:    g.GameType,
		Description: g.Description,
		ImageURL:    g.ImageURL,
		ReleaseDate: g.ReleaseDate,
		Authors:     g.Authors,
		Platforms:   g.Platforms,
	}

	if g.Images != nil {
		resp.Images = g.Images.ToList(imagesSize)
	}

	return resp
}
