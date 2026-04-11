from rest_framework import serializers
from content.models import ContentItem
from core.serializers import BaseFlexSerializer

class ContentItemSerializer(BaseFlexSerializer):
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

    def _should_include_source_data(self):
        if self.context.get('skip_source_data', False):
            return False
        if self.context.get('include_source_data', False):
            return True
        if self.context.get('source_data_cache') is not None:
            return True
        request = self.context.get('request')
        if request:
            if request.query_params.get('source_fields'):
                return True
            expand = request.query_params.get('expand', '')
            if 'source_data' in expand:
                return True
            include = request.query_params.get('include_source_data', '').lower()
            if include in ('true', '1'):
                return True
        return False

    def get_source_data(self, obj):
        if not self._should_include_source_data():
            return None

        source_data_cache = self.context.get('source_data_cache')
        if source_data_cache is not None:
            cached_data = source_data_cache.get(obj.id)
            if cached_data is not None:
                return self._apply_source_fields(cached_data)
            return None

        from content.utils import fetch_source_data

        request = self.context.get('request')
        country_code = request.query_params.get('country') if request else None
        data = fetch_source_data(obj, country_code=country_code)
        if not data:
            return None
        return self._apply_source_fields(data)

    def _apply_source_fields(self, data):
        request = self.context.get('request')
        if request:
            source_fields = request.query_params.get('source_fields')
            if source_fields:
                fields = [f.strip() for f in source_fields.split(',')]
                return self._pick_source_fields(data, fields)
        return data

    def _pick_source_fields(self, data, fields):
        """
        Pick specific fields from the source data using dot notation.
        Example: fields=['title', 'cover.url', 'genres.0.name']
        """
        result = {}
        for field in fields:
            parts = field.split('.')
            value = data
            for part in parts:
                if isinstance(value, dict):
                    value = value.get(part)
                elif isinstance(value, list):
                    try:
                        idx = int(part)
                        if 0 <= idx < len(value):
                            value = value[idx]
                        else:
                            value = None
                    except ValueError:
                        value = None
                else:
                    value = None
                
                if value is None:
                    break
            
            if value is not None:
                # Reconstruct the nested structure in the result
                current = result
                for i, part in enumerate(parts[:-1]):
                    if part not in current:
                        current[part] = {}
                    current = current[part]
                current[parts[-1]] = value
        
        return result

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
