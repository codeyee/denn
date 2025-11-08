from rest_framework import serializers
from ..common import ImageSerializer, PlatformSerializer, AuthorSerializer

class MovieDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField(
        help_text="TMDB movie ID"
    )
    title = serializers.CharField(
        help_text="Movie title"
    )
    original_title = serializers.CharField(
        help_text="Original movie title"
    )
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
