from rest_framework import serializers
from ..common import PaginationMetadataSerializer, AuthorSerializer, PlatformSerializer

class GameSearchItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(help_text="IGDB game ID")
    title = serializers.CharField(help_text="Game title")
    type = serializers.CharField(
        allow_null=True,
        help_text="Game type (e.g., 'Main game', 'DLC', 'Expansion')"
    )
    release_date = serializers.CharField(
        allow_null=True,
        help_text="Release date in YYYY-MM-DD format"
    )
    description = serializers.CharField(
        allow_null=True,
        allow_blank=True,
        help_text="Game description/summary"
    )
    image_url = serializers.URLField(
        allow_null=True,
        help_text="Game cover image URL"
    )
    authors = AuthorSerializer(
        many=True,
        allow_null=True,
        required=False,
        help_text="List of developers/publishers"
    )
    platforms = PlatformSerializer(
        many=True,
        allow_null=True,
        required=False,
        help_text="List of platforms"
    )

class GameSearchResponseSerializer(serializers.Serializer):
    metadata = PaginationMetadataSerializer()
    results = GameSearchItemSerializer(many=True)
