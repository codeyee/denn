from .video import (
    VideoSearchView,
    VideoMovieDetailView,
    VideoTvDetailView,
    VideoTvSeasonDetailView,
    VideoSuggestionsView
)

from .games import (
    GamesSearchView,
    GamesSuggestionsView
)

from .music import (
    MusicSearchView,
    MusicSuggestionsView
)

from .book import (
    BookSearchView,
    BooksSuggestionsView
)

from .homepage import HomepageView

__all__ = [
    'VideoSearchView',
    'VideoMovieDetailView',
    'VideoTvDetailView',
    'VideoTvSeasonDetailView',
    'VideoSuggestionsView',
    'GamesSearchView',
    'GamesSuggestionsView',
    'MusicSearchView',
    'MusicSuggestionsView',
    'BookSearchView',
    'BooksSuggestionsView',
    'HomepageView'
]
