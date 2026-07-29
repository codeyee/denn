package games

type IgdbImage struct {
	ID      int    `json:"id"`
	Url     string `json:"url"`
	ImageID string `json:"image_id"`
}

type IgdbCompany struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type IgdbInvolvedCompany struct {
	ID        int         `json:"id"`
	Company   IgdbCompany `json:"company"`
	Developer bool        `json:"developer"`
}

type IgdbPlatformLogo struct {
	ID      int    `json:"id"`
	ImageID string `json:"image_id"`
}

type IgdbPlatform struct {
	ID           int              `json:"id"`
	Name         string           `json:"name"`
	PlatformLogo IgdbPlatformLogo `json:"platform_logo"`
}

type IgdbGenre struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type IgdbTheme struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type IgdbGameMode struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type IgdbCollection struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type IgdbFranchise struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type IgdbTimeToBeat struct {
	ID         int `json:"id"`
	GameID     int `json:"game_id"`
	Hastily    int `json:"hastily"`
	Normally   int `json:"normally"`
	Completely int `json:"completely"`
	Count      int `json:"count"`
}

type IgdbGame struct {
	ID                int                   `json:"id"`
	Name              string                `json:"name"`
	Summary           string                `json:"summary"`
	Storyline         string                `json:"storyline"`
	Cover             IgdbImage             `json:"cover"`
	Screenshots       []IgdbImage           `json:"screenshots"`
	Artworks          []IgdbImage           `json:"artworks"`
	FirstReleaseDate  int64                 `json:"first_release_date"`
	Platforms         []IgdbPlatform        `json:"platforms"`
	GameType          int                   `json:"game_type"`
	InvolvedCompanies []IgdbInvolvedCompany `json:"involved_companies"`
	Genres            []IgdbGenre           `json:"genres"`
	Themes            []IgdbTheme           `json:"themes"`
	GameModes         []IgdbGameMode        `json:"game_modes"`
	Collections       []IgdbCollection      `json:"collections"`
	Franchises        []IgdbFranchise       `json:"franchises"`
	TimeToBeats       *IgdbTimeToBeat       `json:"game_time_to_beats"`
	TimeToBeatError   bool                  `json:"-"`
}

type IgdbPopularityPrimitive struct {
	GameID         int     `json:"game_id"`
	Value          float64 `json:"value"`
	PopularityType int     `json:"popularity_type"`
}
