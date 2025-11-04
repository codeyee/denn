from rest_framework import serializers
from content.models import Rating, ContentItem
from .content_item import ContentItemSerializer
from .user import UserSerializer

class RatingSerializer(serializers.ModelSerializer):
    content_item = ContentItemSerializer(read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Rating

        fields = [
            'id',
            'user',
            'content_item',
            'score',
            'comment',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'user',
            'content_item',
            'created_at',
            'updated_at'
        ]

class RatingCreateSerializer(serializers.ModelSerializer):
    source_api = serializers.ChoiceField(
        choices=ContentItem.SourceAPI.choices,
        write_only=True
    )

    external_id = serializers.CharField(
        max_length=255,
        write_only=True
    )

    content_type = serializers.ChoiceField(
        choices=ContentItem.ContentType.choices,
        write_only=True
    )

    content_item = ContentItemSerializer(read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Rating

        fields = [
            'id',
            'source_api',
            'external_id',
            'content_type',
            'content_item',
            'user',
            'score',
            'comment',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'content_item',
            'user',
            'created_at',
            'updated_at'
        ]

    def validate_score(self, value):
        score_float = float(value)

        if (score_float * 2) % 1 != 0:
            raise serializers.ValidationError("The score must be a multiple of 0.5 (e.g. 1.0, 1.5, 2.0, etc.)")

        return value

    def validate(self, attrs):
        source_api = attrs.get('source_api')
        content_type = attrs.get('content_type')

        valid_combinations = {
            ContentItem.ContentType.MOVIE: [ContentItem.SourceAPI.TMDB],
            ContentItem.ContentType.TV_SHOW: [ContentItem.SourceAPI.TMDB],
            ContentItem.ContentType.GAME: [ContentItem.SourceAPI.IGDB],
            ContentItem.ContentType.ALBUM: [ContentItem.SourceAPI.SPOTIFY],
            ContentItem.ContentType.BOOK: [ContentItem.SourceAPI.OPENLIBRARY],
        }

        if content_type and source_api:
            valid_apis = valid_combinations.get(content_type, [])

            if source_api not in valid_apis:
                raise serializers.ValidationError({
                    'source_api': f"'{source_api}' is not valid for content_type '{content_type}'"
                })

        return attrs

    def create(self, validated_data):
        source_api = validated_data.pop('source_api')
        external_id = validated_data.pop('external_id')
        content_type = validated_data.pop('content_type')

        content_item, created = ContentItem.objects.get_or_create(
            source_api=source_api,
            external_id=external_id,
            content_type=content_type,
            defaults={}
        )

        rating, created = Rating.objects.update_or_create(
            user=validated_data['user'],
            content_item=content_item,
            defaults={
                'score': validated_data['score'],
                'comment': validated_data.get('comment', '')
            }
        )

        return rating

