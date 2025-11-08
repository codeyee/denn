from rest_framework import serializers
from ..common import ImageSerializer, AuthorSerializer, PlatformSerializer

class GameDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField(
        help_text="IGDB game ID"
    )
    title = serializers.CharField(
        help_text="Game title"
    )
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
    images = ImageSerializer(
        many=True,
        required=False,
        help_text="List of images with type (POSTER, SCREENSHOT, ARTWORK), size (STANDARD, ORIGINAL), and image_url"
    )
