package models

type PlayTime struct {
	Hastily    int `json:"hastily"`
	Normally   int `json:"normally"`
	Completely int `json:"completely"`
}

type Game struct {
	ID               string     `json:"id"`
	Title            string     `json:"title"`
	ContentType      string     `json:"type"`
	Description      *string    `json:"description,omitempty"`
	ImageURL         *string    `json:"image_url,omitempty"`
	GameType         *string    `json:"game_type,omitempty"`
	ReleaseDate      *string    `json:"release_date,omitempty"`
	Authors          []Author   `json:"authors,omitempty"`
	Platforms        []Platform `json:"platforms,omitempty"`
	Genres           []string   `json:"genres,omitempty"`
	Themes           []string   `json:"themes,omitempty"`
	GameModes        []string   `json:"game_modes,omitempty"`
	Series           *string    `json:"series,omitempty"`
	AgeRating        *string    `json:"age_rating,omitempty"`
	PlayTime         *PlayTime  `json:"play_time,omitempty"`
	Images           *Images    `json:"-"`
}

type GameResponse struct {
	ID               string       `json:"id"`
	Type             string       `json:"type"`
	Title            string       `json:"title"`
	GameType         *string      `json:"game_type,omitempty"`
	Description      *string      `json:"description,omitempty"`
	ImageURL         *string      `json:"image_url,omitempty"`
	ReleaseDate      *string      `json:"release_date,omitempty"`
	Authors          []Author     `json:"authors,omitempty"`
	Platforms        []Platform   `json:"platforms,omitempty"`
	Genres           []string     `json:"genres,omitempty"`
	Themes           []string     `json:"themes,omitempty"`
	GameModes        []string     `json:"game_modes,omitempty"`
	Series           *string      `json:"series,omitempty"`
	AgeRating        *string      `json:"age_rating,omitempty"`
	PlayTime         *PlayTime    `json:"play_time,omitempty"`
	Images           []ImageEntry `json:"images,omitempty"`
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
		Genres:      g.Genres,
		Themes:      g.Themes,
		GameModes:   g.GameModes,
		Series:           g.Series,
		AgeRating:        g.AgeRating,
		PlayTime:         g.PlayTime,
	}

	if g.Images != nil {
		resp.Images = g.Images.ToList(imagesSize)
	}

	return resp
}
