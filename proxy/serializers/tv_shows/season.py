from rest_framework import serializers
from ..common import ImageSerializer, PlatformSerializer

class TVEpisodeSerializer(serializers.Serializer):
    id = serializers.IntegerField(help_text="TMDB episode ID")
    episode_number = serializers.IntegerField(help_text="Episode number within season")
    season_number = serializers.IntegerField(help_text="Season number")
    episode_type = serializers.CharField(
        allow_null=True,
        help_text="Episode type (e.g., 'standard', 'finale')"
    )
    title = serializers.CharField(help_text="Episode title")
    description = serializers.CharField(
        allow_null=True,
        allow_blank=True,
        help_text="Episode synopsis"
    )
    release_date = serializers.CharField(
        allow_null=True,
        help_text="Episode air date in YYYY-MM-DD format"
    )
    duration_minutes = serializers.IntegerField(
        allow_null=True,
        help_text="Episode runtime in minutes"
    )
    image_url = serializers.URLField(
        allow_null=True,
        help_text="Episode still image URL"
    )

class TVSeasonSerializer(serializers.Serializer):
    id = serializers.IntegerField(
        help_text="TMDB season ID"
    )
    season_number = serializers.IntegerField(
        help_text="Season number (0 for specials)"
    )
    title = serializers.CharField(
        help_text="Season title"
    )
    description = serializers.CharField(
        allow_null=True,
        allow_blank=True,
        help_text="Season description"
    )
    release_date = serializers.CharField(
        allow_null=True,
        help_text="Season premiere date in YYYY-MM-DD format"
    )
    image_url = serializers.URLField(
        allow_null=True,
        help_text="Season poster URL"
    )
    number_of_episodes = serializers.IntegerField(
        help_text="Number of episodes in season"
    )

class TVSeasonDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField(
        help_text="TMDB season ID"
    )
    season_number = serializers.IntegerField(
        help_text="Season number"
    )
    title = serializers.CharField(
        help_text="Season title"
    )
    description = serializers.CharField(
        allow_null=True,
        allow_blank=True,
        help_text="Season description"
    )
    image_url = serializers.URLField(
        allow_null=True,
        help_text="Season poster URL"
    )
    tv_show_name = serializers.CharField(
        allow_null=True,
        allow_blank=True,
        required=False,
        help_text="Name of the TV show this season belongs to"
    )
    release_date = serializers.CharField(
        allow_null=True,
        help_text="Season premiere date in YYYY-MM-DD format"
    )
    number_of_episodes = serializers.IntegerField(
        help_text="Total number of episodes"
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
    episodes = TVEpisodeSerializer(
        many=True,
        help_text="List of all episodes in season"
    )
