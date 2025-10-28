from .search import MusicSearchView
from .album import MusicAlbumDetailView
from .bulk import MusicBulkAlbumsView
from .suggestions import MusicSuggestionsView

__all__ = [
    'MusicSearchView',
    'MusicAlbumDetailView',
    'MusicBulkAlbumsView',
    'MusicSuggestionsView'
]
