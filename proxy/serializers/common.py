from rest_framework import serializers

class PaginationMetadataSerializer(serializers.Serializer):
    """
    Pagination metadata compatible with CustomPageNumberPagination format.

    Used for external API responses in the proxy module.
    """
    count = serializers.IntegerField(
        allow_null=True,
        help_text="Total number of results across all pages (null if unknown)"
    )
    page_size = serializers.IntegerField(
        help_text="Number of results per page"
    )
    current_page = serializers.IntegerField(
        help_text="Current page number (1-indexed)"
    )
    total_pages = serializers.IntegerField(
        allow_null=True,
        help_text="Total number of pages (null if unknown)"
    )
    next = serializers.URLField(
        allow_null=True,
        required=False,
        help_text="URL to the next page (null if no next page)"
    )
    previous = serializers.URLField(
        allow_null=True,
        required=False,
        help_text="URL to the previous page (null if no previous page)"
    )

class ErrorResponseSerializer(serializers.Serializer):
    error = serializers.CharField(help_text="Error code")
    message = serializers.CharField(help_text="Human-readable error message")

class ImageSerializer(serializers.Serializer):
    type = serializers.CharField(help_text="Image type: POSTER, GALLERY, SCREENSHOT, ARTWORK, etc.")
    size = serializers.CharField(help_text="Image size: STANDARD or ORIGINAL")
    image_url = serializers.URLField(help_text="Image URL")

class AuthorSerializer(serializers.Serializer):
    name = serializers.CharField(help_text="Author name")
    type = serializers.ChoiceField(
        choices=['PERSON', 'COMPANY'],
        help_text="Author type: PERSON or COMPANY"
    )

class PlatformSerializer(serializers.Serializer):
    title = serializers.CharField(help_text="Platform name")
    image_url = serializers.URLField(
        allow_null=True,
        help_text="Platform logo image URL"
    )
    actions = serializers.ListField(
        child=serializers.CharField(),
        allow_null=True,
        required=False,
        help_text="Available actions: STREAM, RENT, BUY"
    )