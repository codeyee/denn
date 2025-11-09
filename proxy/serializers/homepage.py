from rest_framework import serializers
from .movies import MovieDetailSerializer
from .tv_shows import TVShowDetailSerializer
from .games import GameDetailSerializer
from .albums import AlbumDetailSerializer
from .books import BookDetailSerializer

class HomepageResponseSerializer(serializers.Serializer):
    movies = MovieDetailSerializer(many=True, help_text="Suggested movies (detailed)")
    tv_shows = TVShowDetailSerializer(many=True, help_text="Suggested TV shows (detailed)")
    games = GameDetailSerializer(many=True, help_text="Suggested games (detailed)")
    albums = AlbumDetailSerializer(many=True, help_text="Suggested albums (detailed)")
    books = BookDetailSerializer(many=True, help_text="Suggested books (detailed)")
