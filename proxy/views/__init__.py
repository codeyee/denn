from .homepage import HomepageView
from .movies import *
from .tv_shows import *
from .albums import *
from .games import *
from .books import *

__all__ = [
    'HomepageView',
    'MovieSearchView',
    'MovieDetailView',
    'MovieBulkView',
    'TVShowSearchView',
    'TVShowDetailView',
    'TVShowBulkView',
    'TVSeasonDetailView',
    'AlbumSearchView',
    'AlbumDetailView',
    'AlbumBulkView',
    'GameSearchView',
    'GameBulkView',
    'BookSearchView',
    'BookBulkView',
]
