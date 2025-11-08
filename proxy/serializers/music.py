from rest_framework import serializers
from .common import PaginationMetadataSerializer, ImageSerializer

class MusicSearchItemSerializer(serializers.Serializer):
    id = serializers.CharField(help_text="Spotify album ID")
    type = serializers.ChoiceField(
        choices=['album', 'ep'],
        help_text="Album type: 'album' or 'ep'"
    )
    title = serializers.CharField(help_text="Album title")
    authors = serializers.ListField(
        child=serializers.CharField(),
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
    total_tracks = serializers.IntegerField(help_text="Number of tracks in album")
    album_type = serializers.CharField(help_text="Album type from Spotify")
    external_url = serializers.URLField(help_text="Spotify URL for the album")

class MusicSearchResponseSerializer(serializers.Serializer):
    metadata = PaginationMetadataSerializer()
    results = MusicSearchItemSerializer(many=True)

class TrackSerializer(serializers.Serializer):
    id = serializers.CharField(help_text="Spotify track ID")
    title = serializers.CharField(help_text="Track title")
    authors = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of artist names"
    )
    track_number = serializers.IntegerField(help_text="Track number in album")
    duration_seconds = serializers.IntegerField(help_text="Track duration in seconds")
    external_url = serializers.URLField(help_text="Spotify URL for the track")

class AlbumDetailSerializer(serializers.Serializer):
    id = serializers.CharField(help_text="Spotify album ID")
    title = serializers.CharField(help_text="Album title")
    authors = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of artist names"
    )
    image_url = serializers.URLField(
        allow_null=True,
        help_text="Album cover image URL"
    )
    release_date = serializers.CharField(
        allow_null=True,
        help_text="Release date"
    )
    total_tracks = serializers.IntegerField(help_text="Number of tracks in album")
    album_type = serializers.CharField(help_text="Album type from Spotify")
    external_url = serializers.URLField(help_text="Spotify URL for the album")
    tracks = TrackSerializer(many=True, help_text="List of all tracks in album")
    duration_minutes = serializers.IntegerField(
        allow_null=True,
        help_text="Total album duration in minutes (sum of track durations)"
    )
    images = ImageSerializer(
        many=True,
        required=False,
        help_text="List of images with type (POSTER), size (STANDARD, ORIGINAL), and image_url"
    )

class BulkAlbumsResponseSerializer(serializers.Serializer):
    albums = AlbumDetailSerializer(
        many=True,
        allow_null=True,
        help_text="List of albums (may contain null for albums not found)"
    )
