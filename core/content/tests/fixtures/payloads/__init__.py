"""Real-world proxy payloads used as golden fixtures.

Every constant in this package is a normalized payload produced by the Go
proxy for a known item. They drive both `test_browse_metadata` and the
PR-7A mapper / PR-7B reconstructor tests so we exercise the same shapes
end-to-end.
"""
from .movie_memento import PAYLOAD as MOVIE_MEMENTO
from .tv_demon_slayer import PAYLOAD as TV_DEMON_SLAYER
from .season_demon_slayer_s01 import PAYLOAD as SEASON_DEMON_SLAYER_S01
from .album_data import PAYLOAD as ALBUM_DATA
from .game_rdr2 import PAYLOAD as GAME_RDR2
from .book_words_of_radiance import PAYLOAD as BOOK_WORDS_OF_RADIANCE

__all__ = [
    'MOVIE_MEMENTO',
    'TV_DEMON_SLAYER',
    'SEASON_DEMON_SLAYER_S01',
    'ALBUM_DATA',
    'GAME_RDR2',
    'BOOK_WORDS_OF_RADIANCE',
]
