from rest_framework import serializers
from ..common import PaginationMetadataSerializer, AuthorSerializer

class AlbumSearchItemSerializer(serializers.Serializer):
    id = serializers.CharField(
        help_text="Spotify album ID"
    )
    type = serializers.ChoiceField(
        choices=['album', 'ep'],
        help_text="Album type: 'album' or 'ep'"
    )
    title = serializers.CharField(
        help_text="Album title"
    )
    authors = AuthorSerializer(
        many=True,
        allow_null=True,
        required=False,
        help_text="List of artist names"
    )
    image_url = serializers.URLField(
        allow_null=True,
        help_text="Album cover image URL"
    )
    release_date = serializers.CharField(
        allow_null=True,
        help_text="Release date (format varies by precision)"
    )
    total_tracks = serializers.IntegerField(
        help_text="Number of tracks in album"
    )
    album_type = serializers.CharField(
        help_text="Album type from Spotify"
    )
    external_url = serializers.URLField(
        help_text="Spotify URL for the album"
    )

class AlbumSearchResponseSerializer(serializers.Serializer):
    metadata = PaginationMetadataSerializer()
    results = AlbumSearchItemSerializer(many=True)
