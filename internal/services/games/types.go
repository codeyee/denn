package games

type igdbImage struct {
	ID      int    `json:"id"`
	Url     string `json:"url"`
	ImageID string `json:"image_id"`
}

type igdbCompany struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type igdbInvolvedCompany struct {
	ID        int         `json:"id"`
	Company   igdbCompany `json:"company"`
	Developer bool        `json:"developer"`
}

type igdbPlatformLogo struct {
	ID      int    `json:"id"`
	ImageID string `json:"image_id"`
}

type igdbPlatform struct {
	ID           int              `json:"id"`
	Name         string           `json:"name"`
	PlatformLogo igdbPlatformLogo `json:"platform_logo"`
}

type igdbGame struct {
	ID                int                   `json:"id"`
	Name              string                `json:"name"`
	Summary           string                `json:"summary"`
	Storyline         string                `json:"storyline"`
	Cover             igdbImage             `json:"cover"`
	Screenshots       []igdbImage           `json:"screenshots"`
	Artworks          []igdbImage           `json:"artworks"`
	FirstReleaseDate  int64                 `json:"first_release_date"`
	Platforms         []igdbPlatform        `json:"platforms"`
	Category          int                   `json:"category"`
	GameType          int                   `json:"game_type"`
	InvolvedCompanies []igdbInvolvedCompany `json:"involved_companies"`
}

type igdbPopularityPrimitive struct {
	GameID         int     `json:"game_id"`
	Value          float64 `json:"value"`
	PopularityType int     `json:"popularity_type"`
}
