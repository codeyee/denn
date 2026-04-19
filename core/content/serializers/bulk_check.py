from rest_framework import serializers
from ..models.content_item import ContentItem


class BulkCheckItemInputSerializer(serializers.Serializer):
    """Serializer for validating input items in bulk check request."""

    external_id = serializers.CharField(
        max_length=255,
        required=True,
        help_text="External ID from the source API (e.g., '1396:1' for TMDB season)"
    )
    source_api = serializers.CharField(
        required=True,
        help_text="Source API for the content item (case insensitive)"
    )
    content_type = serializers.CharField(
        required=True,
        help_text="Type of content (case insensitive)"
    )

    def validate_source_api(self, value):
        """Validate and normalize source_api to lowercase."""
        normalized = value.lower()
        valid_choices = ['tmdb', 'igdb', 'spotify', 'openlibrary']
        if normalized not in valid_choices:
            raise serializers.ValidationError(
                f"Invalid source_api. Must be one of: {', '.join(valid_choices)}"
            )
        return normalized

    def validate_content_type(self, value):
        """Validate and normalize content_type to uppercase."""
        normalized = value.upper()
        valid_choices = ['MOVIE', 'TV_SHOW', 'SEASON', 'GAME', 'ALBUM', 'BOOK']
        if normalized not in valid_choices:
            raise serializers.ValidationError(
                f"Invalid content_type. Must be one of: {', '.join(valid_choices)}"
            )
        return normalized


class BulkCheckItemSerializer(serializers.Serializer):
    """Serializer for matched items in bulk check response.

    Includes both ContentItem data (for identification) and ListItem ID (for deletion).
    """

    list_item_id = serializers.IntegerField(
        read_only=True,
        help_text="ListItem ID - use this for deleting items from lists"
    )
    content_item_id = serializers.IntegerField(
        read_only=True,
        help_text="ContentItem ID - unique identifier for the content"
    )
    external_id = serializers.CharField(
        read_only=True,
        help_text="External ID from source API"
    )
    source_api = serializers.CharField(
        read_only=True,
        help_text="Source API (tmdb, igdb, spotify, openlibrary)"
    )
    content_type = serializers.CharField(
        read_only=True,
        help_text="Content type (MOVIE, TV_SHOW, SEASON, GAME, ALBUM, BOOK)"
    )


class BulkCheckListSerializer(serializers.Serializer):
    """Serializer for list with matched items in bulk check response."""

    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    list_type = serializers.CharField(read_only=True)
    item_count = serializers.IntegerField(read_only=True)
    matched_count = serializers.IntegerField(
        read_only=True,
        help_text="Number of queried items found in this list"
    )
    matched_items = BulkCheckItemSerializer(
        many=True,
        read_only=True,
        help_text="Array of queried items that exist in this list"
    )


class BulkCheckRequestSerializer(serializers.Serializer):
    """Serializer for bulk check request body."""

    items = BulkCheckItemInputSerializer(
        many=True,
        required=True,
        help_text="Array of items to check (max 100 items)"
    )

    def validate_items(self, value):
        """Validate items array constraints."""
        if not value:
            raise serializers.ValidationError("At least one item must be provided.")
        if len(value) > 100:
            raise serializers.ValidationError("Maximum 100 items allowed per request.")
        return value


class BulkCheckResponseSerializer(serializers.Serializer):
    """Serializer for bulk check response."""

    queried_items_count = serializers.IntegerField(
        read_only=True,
        help_text="Total number of items queried"
    )
    lists = BulkCheckListSerializer(
        many=True,
        read_only=True,
        help_text="All user's lists with matched item information"
    )
