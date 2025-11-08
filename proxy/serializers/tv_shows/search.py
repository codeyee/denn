from rest_framework import serializers
from ..common import PaginationMetadataSerializer

class TVShowSearchItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(help_text="TMDB ID")
    type = serializers.ChoiceField(
        choices=['tv'],
        help_text="Content type: 'tv'"
    )
    title = serializers.CharField(help_text="Title in English or original language")
    original_title = serializers.CharField(help_text="Original title")
    description = serializers.CharField(
        allow_null=True,
        allow_blank=True,
        help_text="Plot synopsis"
    )
    image_url = serializers.URLField(
        allow_null=True,
        help_text="Poster image URL from TMDB"
    )
    release_date = serializers.CharField(
        allow_null=True,
        help_text="Release date in YYYY-MM-DD format"
    )

class TVShowSearchResponseSerializer(serializers.Serializer):
    metadata = PaginationMetadataSerializer()
    results = TVShowSearchItemSerializer(many=True)
