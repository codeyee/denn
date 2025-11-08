from .video import (
    VideoSearchView,
    VideoMovieDetailView,
    VideoTvDetailView,
    VideoTvSeasonDetailView,
)

from .games import (
    GamesSearchView,
)

from .music import (
    MusicSearchView,
)

from .book import (
    BookSearchView,
)

from .homepage import HomepageView

__all__ = [
    'VideoSearchView',
    'VideoMovieDetailView',
    'VideoTvDetailView',
    'VideoTvSeasonDetailView',
    'GamesSearchView',
    'MusicSearchView',
    'BookSearchView',
    'HomepageView'
]
