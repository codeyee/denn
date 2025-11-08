from rest_framework import serializers
from .detail import AlbumDetailSerializer

class BulkAlbumsResponseSerializer(serializers.Serializer):
    albums = AlbumDetailSerializer(
        many=True,
        allow_null=True,
        help_text="List of albums (may contain null for albums not found)"
    )
