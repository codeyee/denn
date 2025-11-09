from .common import (
    PaginationMetadataSerializer,
    ErrorResponseSerializer,
    ImageSerializer,
    AuthorSerializer,
    PlatformSerializer,
)
from .movies import *
from .tv_shows import *
from .albums import *
from .games import *
from .books import *
from .homepage import *

__all__ = [
    'PaginationMetadataSerializer',
    'ErrorResponseSerializer',
    'ImageSerializer',
    'AuthorSerializer',
    'PlatformSerializer',
    'MovieSearchItemSerializer',
    'MovieSearchResponseSerializer',
    'MovieDetailSerializer',
    'TVShowSearchItemSerializer',
    'TVShowSearchResponseSerializer',
    'TVShowDetailSerializer',
    'TVSeasonSerializer',
    'TVEpisodeSerializer',
    'TVSeasonDetailSerializer',
    'AlbumSearchItemSerializer',
    'AlbumSearchResponseSerializer',
    'AlbumDetailSerializer',
    'TrackSerializer',
    'GameSearchItemSerializer',
    'GameSearchResponseSerializer',
    'GameDetailSerializer',
    'BookSearchItemSerializer',
    'BookSearchResponseSerializer',
    'BookDetailSerializer',
    'HomepageResponseSerializer',
]
