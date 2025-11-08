from rest_framework import serializers
from ..common import ImageSerializer, PlatformSerializer, AuthorSerializer
from .season import TVSeasonSerializer

class TVShowDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField(
        help_text="TMDB TV show ID"
    )
    title = serializers.CharField(
        help_text="TV show title"
    )
    original_title = serializers.CharField(
        help_text="Original TV show title"
    )
    description = serializers.CharField(
        allow_null=True,
        allow_blank=True,
        help_text="TV show synopsis"
    )
    image_url = serializers.URLField(
        allow_null=True,
        help_text="TV show poster URL (standard size)"
    )
    tagline = serializers.CharField(
        allow_null=True,
        allow_blank=True,
        help_text="TV show tagline",
        required=False
    )
    imdb_id = serializers.CharField(
        allow_null=True,
        allow_blank=True,
        help_text="IMDB ID",
        required=False
    )
    release_date = serializers.CharField(
        allow_null=True,
        help_text="First air date in YYYY-MM-DD format"
    )
    status = serializers.CharField(
        allow_null=True,
        help_text="Status (e.g., 'Returning Series', 'Ended')"
    )
    number_of_seasons = serializers.IntegerField(
        allow_null=True,
        help_text="Total number of seasons"
    )
    number_of_episodes = serializers.IntegerField(
        allow_null=True,
        help_text="Total number of episodes"
    )
    authors = AuthorSerializer(
        many=True,
        allow_null=True,
        required=False,
        help_text="List of production companies"
    )
    images = ImageSerializer(
        many=True,
        required=False,
        help_text="List of images with type (POSTER, GALLERY), size (STANDARD, ORIGINAL), and image_url"
    )
    platforms = serializers.DictField(
        child=PlatformSerializer(many=True),
        allow_null=True,
        required=False,
        help_text="Watch platforms grouped by country code. Format: { 'CO': [...], 'AR': [...], 'MX': [...] } when no country param, or { 'US': [...] } when country param provided"
    )
    seasons = TVSeasonSerializer(
        many=True,
        help_text="List of all seasons"
    )
