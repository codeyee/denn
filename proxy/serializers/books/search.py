from rest_framework import serializers
from ..common import PaginationMetadataSerializer, ImageSerializer, AuthorSerializer

class BookSearchItemSerializer(serializers.Serializer):
    id = serializers.CharField(
        help_text="OpenLibrary work ID"
    )
    title = serializers.CharField(
        help_text="Book title"
    )
    authors = AuthorSerializer(
        many=True,
        allow_null=True,
        required=False,
        help_text="List of author names"
    )
    image_url = serializers.URLField(
        allow_null=True,
        help_text="Book cover image URL"
    )
    release_date = serializers.CharField(
        allow_null=True,
        help_text="Publication date in YYYY-MM-DD format or year"
    )
    pages = serializers.IntegerField(
        allow_null=True,
        help_text="Number of pages (median)"
    )
    description = serializers.CharField(
        allow_null=True,
        allow_blank=True,
        help_text="Book description or first sentence"
    )
    images = ImageSerializer(
        many=True,
        required=False,
        help_text="List of images with type (POSTER), size (STANDARD, ORIGINAL), and image_url"
    )

class BookSearchResponseSerializer(serializers.Serializer):
    metadata = PaginationMetadataSerializer()
    results = BookSearchItemSerializer(many=True)
