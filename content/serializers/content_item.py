from rest_framework import serializers
from content.models import ContentItem

class ContentItemSerializer(serializers.ModelSerializer):
    source_data = serializers.SerializerMethodField()

    class Meta:
        model = ContentItem

        fields = [
            'id',
            'source_api',
            'external_id',
            'content_type',
            'rating_count',
            'average_rating',
            'created_at',
            'source_data',
        ]

        read_only_fields = [
            'id',
            'rating_count',
            'average_rating',
            'created_at',
            'source_data',
        ]

    def get_source_data(self, obj):
        # Skip fetching source data if explicitly disabled in context
        if self.context.get('skip_source_data', False):
            return None

        request = self.context.get('request')
        from content.utils import fetch_source_data

        # Always fetch source data
        country_code = request.query_params.get('country', None) if request else None
        return fetch_source_data(obj, country_code=country_code)

    def validate(self, attrs):
        source_api = attrs.get('source_api')
        content_type = attrs.get('content_type')

        valid_combinations = {
            ContentItem.ContentType.MOVIE: [ContentItem.SourceAPI.TMDB],
            ContentItem.ContentType.TV_SHOW: [ContentItem.SourceAPI.TMDB],
            ContentItem.ContentType.SEASON: [ContentItem.SourceAPI.TMDB],
            ContentItem.ContentType.GAME: [ContentItem.SourceAPI.IGDB],
            ContentItem.ContentType.ALBUM: [ContentItem.SourceAPI.SPOTIFY],
            ContentItem.ContentType.BOOK: [ContentItem.SourceAPI.OPENLIBRARY],
        }

        if content_type and source_api:
            valid_apis = valid_combinations.get(content_type, [])

            if source_api not in valid_apis:
                raise serializers.ValidationError(f"source_api '{source_api}' is not valid for content_type '{content_type}'")

        return attrs
