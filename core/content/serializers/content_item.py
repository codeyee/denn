from rest_framework import serializers
from content.models import ContentItem
from core.serializers import BaseFlexSerializer

class ContentItemSerializer(BaseFlexSerializer):
    source_data = serializers.SerializerMethodField()
    current_user_rating = serializers.SerializerMethodField()

    class Meta:
        model = ContentItem

        fields = [
            'id',
            'source_api',
            'external_id',
            'content_type',
            'rating_count',
            'average_rating',
            'current_user_rating',
            'created_at',
            'source_data',
        ]

        read_only_fields = [
            'id',
            'rating_count',
            'average_rating',
            'current_user_rating',
            'created_at',
            'source_data',
        ]

    def get_current_user_rating(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        prefetched_ratings = getattr(obj, 'current_user_ratings', None)
        if prefetched_ratings is None:
            return None
        rating = prefetched_ratings[0] if prefetched_ratings else None
        if rating is None:
            return None

        return {
            'id': rating.id,
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
            },
            'content_item': {
                'id': obj.id,
                'source_api': obj.source_api,
                'external_id': obj.external_id,
                'content_type': obj.content_type,
                'rating_count': obj.rating_count,
                'average_rating': obj.average_rating,
                'created_at': obj.created_at,
                'source_data': None,
                'current_user_rating': None,
            },
            'score': rating.score,
            'comment': rating.comment,
            'created_at': rating.created_at,
            'updated_at': rating.updated_at,
        }

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
            if 'content_item' in expand or 'source_data' in expand:
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

        # Source data must be orchestrated by the view so a serializer can
        # never introduce an unbounded provider call by accident.
        return None

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
