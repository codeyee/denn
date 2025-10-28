from .search import VideoSearchView
from .movie import VideoMovieDetailView
from .tv import VideoTvDetailView
from .season import VideoTvSeasonDetailView
from .bulk import VideoBulkMoviesView, VideoBulkTvShowsView
from .bulk_seasons import VideoBulkSeasonsView
from .suggestions import VideoSuggestionsView

__all__ = [
    'VideoSearchView',
    'VideoMovieDetailView',
    'VideoTvDetailView',
    'VideoTvSeasonDetailView',
    'VideoBulkMoviesView',
    'VideoBulkTvShowsView',
    'VideoBulkSeasonsView',
    'VideoSuggestionsView'
]

