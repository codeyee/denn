from rest_framework import serializers
from .video import VideoSearchItemSerializer
from .games import GameSearchItemSerializer
from .music import MusicSearchItemSerializer
from .books import BookSearchItemSerializer

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
    movies = VideoSearchItemSerializer(many=True, help_text="Suggested movies")
    tv = VideoSearchItemSerializer(many=True, help_text="Suggested TV shows")
    games = GameSearchItemSerializer(many=True, help_text="Suggested games")
    music = MusicSearchItemSerializer(many=True, help_text="Suggested albums")
    books = BookSearchItemSerializer(many=True, help_text="Suggested books")
