from rest_framework import serializers
from ..common import ImageSerializer, AuthorSerializer

class BookDetailSerializer(serializers.Serializer):
    id = serializers.CharField(
        help_text="OpenLibrary work ID"
    )
    type = serializers.ChoiceField(
        choices=['BOOK'],
        help_text="Content type: 'BOOK'"
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
    images = ImageSerializer(
        many=True,
        required=False,
        help_text="List of images with type (POSTER), size (STANDARD, ORIGINAL), and image_url"
    )
