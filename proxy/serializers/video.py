from rest_framework import serializers
from .common import PaginationMetadataSerializer

class VideoSearchItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(help_text="TMDB ID")
    type = serializers.ChoiceField(
        choices=['movie', 'tv'],
        help_text="Content type: 'movie' or 'tv'"
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

class VideoSearchResponseSerializer(serializers.Serializer):
    metadata = PaginationMetadataSerializer()
    results = VideoSearchItemSerializer(many=True)

class ProviderSerializer(serializers.Serializer):
    id = serializers.IntegerField(help_text="Provider ID")
    name = serializers.CharField(help_text="Provider name")
    image_url = serializers.URLField(
        allow_null=True,
        help_text="Provider logo image URL"
    )
    type = serializers.ChoiceField(
        choices=['streaming', 'rent', 'buy', 'rent_buy'],
        help_text="Provider type: streaming (flatrate), rent, buy, or rent_buy"
    )

class MovieDetailSerializer(serializers.Serializer):
    # Primitive metadata
    id = serializers.IntegerField(help_text="TMDB movie ID")
    title = serializers.CharField(help_text="Movie title")
    original_title = serializers.CharField(help_text="Original movie title")
    description = serializers.CharField(
        allow_null=True,
        allow_blank=True,
        help_text="Movie plot synopsis"
    )
    image_url = serializers.URLField(
        allow_null=True,
        help_text="Movie poster URL (standard size)"
    )
    tagline = serializers.CharField(
        allow_null=True,
        allow_blank=True,
        help_text="Movie tagline",
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
        help_text="Release date in YYYY-MM-DD format"
    )
    duration_minutes = serializers.IntegerField(
        allow_null=True,
        help_text="Movie runtime in minutes"
    )
    status = serializers.CharField(
        allow_null=True,
        help_text="Release status (e.g., 'Released', 'Post Production')"
    )
    # Complex metadata
    images = serializers.DictField(
        child=serializers.DictField(
            child=serializers.URLField(allow_null=True, required=False),
            required=False
        ),
        help_text="Image variants grouped by type (poster/backdrop) with generic keys: standard, original",
        required=False
    )
    providers = serializers.DictField(
        child=ProviderSerializer(many=True),
        allow_null=True,
        required=False,
        help_text="Watch providers grouped by country code. Format: { 'CO': [...], 'AR': [...], 'MX': [...] } when no country param, or { 'US': [...] } when country param provided"
    )

class TVSeasonSerializer(serializers.Serializer):
    id = serializers.IntegerField(help_text="TMDB season ID")
    season_number = serializers.IntegerField(help_text="Season number (0 for specials)")
    title = serializers.CharField(help_text="Season title")
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
    number_of_episodes = serializers.IntegerField(help_text="Number of episodes in season")

class TVShowDetailSerializer(serializers.Serializer):
    # Primitive metadata
    id = serializers.IntegerField(help_text="TMDB TV show ID")
    title = serializers.CharField(help_text="TV show title")
    original_title = serializers.CharField(help_text="Original TV show title")
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
    # Complex metadata
    images = serializers.DictField(
        child=serializers.DictField(
            child=serializers.URLField(allow_null=True, required=False),
            required=False
        ),
        help_text="Image variants grouped by type (poster/backdrop) with generic keys: standard, original",
        required=False
    )
    providers = serializers.DictField(
        child=ProviderSerializer(many=True),
        allow_null=True,
        required=False,
        help_text="Watch providers grouped by country code. Format: { 'CO': [...], 'AR': [...], 'MX': [...] } when no country param, or { 'US': [...] } when country param provided"
    )
    seasons = TVSeasonSerializer(many=True, help_text="List of all seasons")

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

class TVSeasonDetailSerializer(serializers.Serializer):
    # Primitive metadata
    id = serializers.IntegerField(help_text="TMDB season ID")
    season_number = serializers.IntegerField(help_text="Season number")
    title = serializers.CharField(help_text="Season title")
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
    number_of_episodes = serializers.IntegerField(help_text="Total number of episodes")
    # Complex metadata
    images = serializers.DictField(
        child=serializers.DictField(
            child=serializers.URLField(allow_null=True, required=False),
            required=False
        ),
        help_text="Image variants grouped by type (poster/backdrop) with generic keys: standard, original",
        required=False
    )
    providers = serializers.DictField(
        child=ProviderSerializer(many=True),
        allow_null=True,
        required=False,
        help_text="Watch providers grouped by country code. Format: { 'CO': [...], 'AR': [...], 'MX': [...] } when no country param, or { 'US': [...] } when country param provided"
    )
    episodes = TVEpisodeSerializer(many=True, help_text="List of all episodes in season")

class BulkMovieItemSerializer(serializers.Serializer):
    key = serializers.IntegerField(help_text="The movie ID that was requested", required=False)
    id = serializers.IntegerField(help_text="The movie ID", required=False)
    data = MovieDetailSerializer(allow_null=True, help_text="Movie details")
    status_code = serializers.IntegerField(help_text="HTTP status code for this item")
    error = serializers.CharField(
        allow_null=True,
        help_text="Error message if request failed"
    )

class BulkTVShowItemSerializer(serializers.Serializer):
    key = serializers.IntegerField(help_text="The TV show ID that was requested", required=False)
    id = serializers.IntegerField(help_text="The TV show ID", required=False)
    data = TVShowDetailSerializer(allow_null=True, help_text="TV show details")
    status_code = serializers.IntegerField(help_text="HTTP status code for this item")
    error = serializers.CharField(
        allow_null=True,
        help_text="Error message if request failed"
    )

class BulkSeasonItemSerializer(serializers.Serializer):
    tv_id = serializers.IntegerField(help_text="The TV show ID")
    season_number = serializers.IntegerField(help_text="The season number")
    data = TVSeasonDetailSerializer(allow_null=True, help_text="Season details")
    status_code = serializers.IntegerField(help_text="HTTP status code for this item")
    error = serializers.CharField(
        allow_null=True,
        help_text="Error message if request failed"
    )
