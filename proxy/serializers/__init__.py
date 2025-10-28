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
    BulkGameItemSerializer,
)

from .books import (
    BookSearchItemSerializer,
    BookSearchResponseSerializer,
    BookDetailSerializer,
    BulkBookItemSerializer,
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

    'MusicSearchItemSerializer',
    'MusicSearchResponseSerializer',
    'TrackSerializer',
    'AlbumDetailSerializer',
    'BulkAlbumsResponseSerializer',

    'GameSearchItemSerializer',
    'GameSearchResponseSerializer',
    'GameDetailSerializer',
    'BulkGameItemSerializer',

    'BookSearchItemSerializer',
    'BookSearchResponseSerializer',
    'BookDetailSerializer',
    'BulkBookItemSerializer',

    'VideoSuggestionsResponseSerializer',
    'GamesSuggestionsResponseSerializer',
    'MusicSuggestionsResponseSerializer',
    'BooksSuggestionsResponseSerializer',
    'HomepageResponseSerializer',
]
