from rest_framework import serializers
from .common import PaginationMetadataSerializer

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
    authors = serializers.ListField(
        child=serializers.CharField(),
        allow_null=True,
        help_text="List of developers/publishers"
    )
    platforms = serializers.ListField(
        child=serializers.CharField(),
        allow_null=True,
        help_text="List of platform names"
    )

class GameSearchResponseSerializer(serializers.Serializer):
    metadata = PaginationMetadataSerializer()
    results = GameSearchItemSerializer(many=True)

class GameDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField(help_text="IGDB game ID")
    title = serializers.CharField(help_text="Game title")
    type = serializers.CharField(
        allow_null=True,
        help_text="Game type"
    )
    release_date = serializers.CharField(
        allow_null=True,
        help_text="Release date in YYYY-MM-DD format"
    )
    description = serializers.CharField(
        allow_null=True,
        allow_blank=True,
        help_text="Game description"
    )
    image_url = serializers.URLField(
        allow_null=True,
        help_text="Game cover image URL"
    )
    authors = serializers.ListField(
        child=serializers.CharField(),
        allow_null=True,
        help_text="List of developers/publishers"
    )
    platforms = serializers.ListField(
        child=serializers.CharField(),
        allow_null=True,
        help_text="List of platform names"
    )

class BulkGameItemSerializer(serializers.Serializer):
    key = serializers.IntegerField(help_text="The game ID that was requested", required=False)
    id = serializers.IntegerField(help_text="The game ID", required=False)
    data = GameDetailSerializer(allow_null=True, help_text="Game details")
    status_code = serializers.IntegerField(help_text="HTTP status code for this item")
    error = serializers.CharField(
        allow_null=True,
        help_text="Error message if request failed"
    )
