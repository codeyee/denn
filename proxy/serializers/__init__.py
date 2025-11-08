from .common import (
    PaginationMetadataSerializer,
    ErrorResponseSerializer,
)

from .video import (
    VideoSearchItemSerializer,
    VideoSearchResponseSerializer,
    MovieDetailSerializer,
    TVSeasonSerializer,
    TVShowDetailSerializer,
    TVEpisodeSerializer,
    TVSeasonDetailSerializer,
    BulkMovieItemSerializer,
    BulkTVShowItemSerializer,
    BulkSeasonItemSerializer,
    BulkMoviesResponseSerializer,
    BulkTVShowsResponseSerializer,
    BulkSeasonsResponseSerializer,
)

from .music import (
    MusicSearchItemSerializer,
    MusicSearchResponseSerializer,
    TrackSerializer,
    AlbumDetailSerializer,
    BulkAlbumsResponseSerializer,
)

from .games import (
    GameSearchItemSerializer,
    GameSearchResponseSerializer,
    GameDetailSerializer,
)

from .books import (
    BookSearchItemSerializer,
    BookSearchResponseSerializer,
    BookDetailSerializer,
)

from .homepage import (
    VideoSuggestionsResponseSerializer,
    GamesSuggestionsResponseSerializer,
    MusicSuggestionsResponseSerializer,
    BooksSuggestionsResponseSerializer,
    HomepageResponseSerializer,
)

__all__ = [
    'PaginationMetadataSerializer',
    'ErrorResponseSerializer',

    'VideoSearchItemSerializer',
    'VideoSearchResponseSerializer',
    'MovieDetailSerializer',
    'TVSeasonSerializer',
    'TVShowDetailSerializer',
    'TVEpisodeSerializer',
    'TVSeasonDetailSerializer',
    'BulkMovieItemSerializer',
    'BulkTVShowItemSerializer',
    'BulkSeasonItemSerializer',
    'BulkMoviesResponseSerializer',
    'BulkTVShowsResponseSerializer',
    'BulkSeasonsResponseSerializer',

    'MusicSearchItemSerializer',
    'MusicSearchResponseSerializer',
    'TrackSerializer',
    'AlbumDetailSerializer',
    'BulkAlbumsResponseSerializer',

    'GameSearchItemSerializer',
    'GameSearchResponseSerializer',
    'GameDetailSerializer',

    'BookSearchItemSerializer',
    'BookSearchResponseSerializer',
    'BookDetailSerializer',

    'VideoSuggestionsResponseSerializer',
    'GamesSuggestionsResponseSerializer',
    'MusicSuggestionsResponseSerializer',
    'BooksSuggestionsResponseSerializer',
    'HomepageResponseSerializer',
]
