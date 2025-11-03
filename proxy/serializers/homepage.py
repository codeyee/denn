from rest_framework import serializers
from .video import (
    VideoSearchItemSerializer,
    MovieDetailSerializer,
    TVShowDetailSerializer,
)
from .games import GameSearchItemSerializer, GameDetailSerializer
from .music import MusicSearchItemSerializer, AlbumDetailSerializer
from .books import BookSearchItemSerializer, BookDetailSerializer

class VideoSuggestionsResponseSerializer(serializers.Serializer):
    results = VideoSearchItemSerializer(many=True, help_text="List of suggested movies and TV shows")
    count = serializers.IntegerField(help_text="Number of suggestions returned")

class GamesSuggestionsResponseSerializer(serializers.Serializer):
    results = GameSearchItemSerializer(many=True, help_text="List of suggested games")
    count = serializers.IntegerField(help_text="Number of suggestions returned")

class MusicSuggestionsResponseSerializer(serializers.Serializer):
    results = MusicSearchItemSerializer(many=True, help_text="List of suggested albums")
    count = serializers.IntegerField(help_text="Number of suggestions returned")

class BooksSuggestionsResponseSerializer(serializers.Serializer):
    results = BookSearchItemSerializer(many=True, help_text="List of suggested books")
    count = serializers.IntegerField(help_text="Number of suggestions returned")

class HomepageResponseSerializer(serializers.Serializer):
    movies = MovieDetailSerializer(many=True, help_text="Suggested movies (detailed)")
    tv_shows = TVShowDetailSerializer(many=True, help_text="Suggested TV shows (detailed)")
    games = GameDetailSerializer(many=True, help_text="Suggested games (detailed)")
    music = AlbumDetailSerializer(many=True, help_text="Suggested albums (detailed)")
    books = BookDetailSerializer(many=True, help_text="Suggested books (detailed)")
