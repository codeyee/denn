package models

type PlayTime struct {
	Hastily    int `json:"hastily"`
	Normally   int `json:"normally"`
	Completely int `json:"completely"`
}

type GameDuration struct {
	Source            string `json:"source"`
	Status            string `json:"status"`
	HastilySeconds    *int   `json:"hastily_seconds,omitempty"`
	NormallySeconds   *int   `json:"normally_seconds,omitempty"`
	CompletelySeconds *int   `json:"completely_seconds,omitempty"`
	SampleCount       int    `json:"sample_count,omitempty"`
}

type Game struct {
	ID          string        `json:"id"`
	Title       string        `json:"title"`
	ContentType string        `json:"type"`
	Description *string       `json:"description,omitempty"`
	ImageURL    *string       `json:"image_url,omitempty"`
	GameType    *string       `json:"game_type,omitempty"`
	ReleaseDate *string       `json:"release_date,omitempty"`
	Authors     []Author      `json:"authors,omitempty"`
	Platforms   []Platform    `json:"platforms,omitempty"`
	Genres      []string      `json:"genres,omitempty"`
	Themes      []string      `json:"themes,omitempty"`
	GameModes   []string      `json:"game_modes,omitempty"`
	Series      *string       `json:"series,omitempty"`
	PlayTime    *PlayTime     `json:"play_time,omitempty"`
	Duration    *GameDuration `json:"duration,omitempty"`
	Images      *Images       `json:"-"`
}

type GameResponse struct {
	ID          string        `json:"id"`
	Type        string        `json:"type"`
	Title       string        `json:"title"`
	GameType    *string       `json:"game_type,omitempty"`
	Description *string       `json:"description,omitempty"`
	ImageURL    *string       `json:"image_url,omitempty"`
	ReleaseDate *string       `json:"release_date,omitempty"`
	Authors     []Author      `json:"authors,omitempty"`
	Platforms   []Platform    `json:"platforms,omitempty"`
	Genres      []string      `json:"genres,omitempty"`
	Themes      []string      `json:"themes,omitempty"`
	GameModes   []string      `json:"game_modes,omitempty"`
	Series      *string       `json:"series,omitempty"`
	PlayTime    *PlayTime     `json:"play_time,omitempty"`
	Duration    *GameDuration `json:"duration,omitempty"`
	Images      []ImageEntry  `json:"images,omitempty"`
}

func (g *Game) ToResponse() GameResponse {
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
		Series:      g.Series,
		PlayTime:    g.PlayTime,
		Duration:    g.Duration,
	}

	if g.Images != nil {
		resp.Images = g.Images.ToList(DefaultImagesSize)
	}

	return resp
}
