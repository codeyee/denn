from rest_framework import serializers
from .common import PaginationMetadataSerializer

class ImageVariantSerializer(serializers.Serializer):
    standard = serializers.URLField(allow_null=True, required=False)
    original = serializers.URLField(allow_null=True, required=False)

class BookImagesSerializer(serializers.Serializer):
    poster = ImageVariantSerializer(required=False)

class BookSearchItemSerializer(serializers.Serializer):
    id = serializers.CharField(help_text="OpenLibrary work ID")
    title = serializers.CharField(help_text="Book title")
    authors = serializers.ListField(
        child=serializers.CharField(),
        allow_null=True,
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
    images = BookImagesSerializer(required=False, help_text="Image variants: poster (standard/original)")

class BookSearchResponseSerializer(serializers.Serializer):
    metadata = PaginationMetadataSerializer()
    results = BookSearchItemSerializer(many=True)

class BookDetailSerializer(serializers.Serializer):
    id = serializers.CharField(help_text="OpenLibrary work ID")
    title = serializers.CharField(help_text="Book title")
    authors = serializers.ListField(
        child=serializers.CharField(),
        allow_null=True,
        help_text="List of author names"
    )
    image_url = serializers.URLField(
        allow_null=True,
        help_text="Book cover image URL"
    )
    release_date = serializers.CharField(
        allow_null=True,
        help_text="Publication date"
    )
    pages = serializers.IntegerField(
        allow_null=True,
        help_text="Number of pages"
    )
    description = serializers.CharField(
        allow_null=True,
        allow_blank=True,
        help_text="Book description"
    )
    images = BookImagesSerializer(
        required=False,
        help_text="Image variants: poster (standard/original)"
    )

class BulkBookItemSerializer(serializers.Serializer):
    key = serializers.CharField(help_text="The book ID that was requested")
    data = BookDetailSerializer(allow_null=True, help_text="Book details")
    status_code = serializers.IntegerField(help_text="HTTP status code for this item")
    error = serializers.CharField(
        allow_null=True,
        help_text="Error message if request failed"
    )
