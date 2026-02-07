from rest_framework import serializers
from content.models import ListItem, ContentItem, Rating
from .content_item import ContentItemSerializer
from .user import UserSerializer

from core.serializers import BaseFlexSerializer
from core.exceptions import DuplicateItemException

class MemberRatingSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Rating
        fields = ['user', 'score', 'comment', 'created_at', 'updated_at', 'is_owner']
        read_only_fields = fields

    def get_is_owner(self, obj):
        """Determine if this rating's user is the owner of the list"""
        user_list = self.context.get('user_list')
        if user_list:
            return obj.user.id == user_list.owner.id
        return False

class ListItemSerializer(BaseFlexSerializer):
    content_item = serializers.SerializerMethodField()
    added_by = UserSerializer(read_only=True)
    member_ratings = serializers.SerializerMethodField()
    list_rating = serializers.SerializerMethodField()
    member_rating_count = serializers.SerializerMethodField()

    class Meta:
        model = ListItem

        fields = [
            'id',
            'user_list',
            'list_order',
            'content_item',
            'added_by',
            'status',
            'added_at',
            'completed_at',
            'member_ratings',
            'list_rating',
            'member_rating_count',
        ]

        read_only_fields = [
            'id',
            'user_list',
            'list_order',
            'content_item',
            'added_by',
            'added_at',
            'completed_at',
            'member_ratings',
            'list_rating',
            'member_rating_count',
        ]

        expandable_fields = {
            'content_item': (ContentItemSerializer, {'many': False}),
            'user_list': ('content.serializers.UserListSerializer', {'many': False}),
            'added_by': (UserSerializer, {'many': False}),
        }

    def get_content_item(self, obj):
        kwargs = {'context': self.context}
        request = self.context.get('request')

        if request:
            query_fields = request.query_params.get('fields', '')
            query_expand = request.query_params.get('expand', '')

            # Check for content_item.
            fields = [f[13:] for f in query_fields.split(',') if f.strip().startswith('content_item.')]
            expand = [f[13:] for f in query_expand.split(',') if f.strip().startswith('content_item.')]

            # Check for items.content_item. (fallback/support for nested usage if manual pass failed or just to be robust)
            if not fields:
                fields = [f[19:] for f in query_fields.split(',') if f.strip().startswith('items.content_item.')]
            if not expand:
                expand = [f[19:] for f in query_expand.split(',') if f.strip().startswith('items.content_item.')]

            if fields:
                kwargs['fields'] = fields
            if expand:
                kwargs['expand'] = expand

        return ContentItemSerializer(obj.content_item, **kwargs).data

    def _get_member_ids(self, obj):
        """
        Helper to get all member IDs including owner.
        Uses prefetch cache when available to avoid extra queries.
        """
        # Use prefetch cache if available
        if hasattr(obj.user_list, '_prefetched_objects_cache') and \
           'members' in obj.user_list._prefetched_objects_cache:
            member_ids = [m.id for m in obj.user_list.members.all()]
        else:
            member_ids = list(obj.user_list.members.values_list('id', flat=True))

        # Ensure owner is included
        if obj.user_list.owner_id not in member_ids:
            member_ids.append(obj.user_list.owner_id)

        return member_ids

    def get_member_ratings(self, obj):
        if obj.status != ListItem.Status.COMPLETED:
            return []

        if hasattr(obj.content_item, 'member_ratings_prefetched'):
            member_ratings = obj.content_item.member_ratings_prefetched
            return MemberRatingSerializer(
                member_ratings,
                many=True,
                context={'user_list': obj.user_list}
            ).data

        # Fallback: query database
        member_ids = self._get_member_ids(obj)
        member_ratings = Rating.objects.filter(
            content_item=obj.content_item,
            user_id__in=member_ids
        ).select_related('user')

        return MemberRatingSerializer(
            member_ratings,
            many=True,
            context={'user_list': obj.user_list}
        ).data

    def get_list_rating(self, obj):
        if obj.status != ListItem.Status.COMPLETED:
            return None

        if hasattr(obj, 'member_rating_avg_annotated'):
            avg = obj.member_rating_avg_annotated
            return round(float(avg), 1) if avg is not None else None

        # Fallback: calculate from pre-fetched ratings or query database
        if hasattr(obj.content_item, 'member_ratings_prefetched'):
            member_ratings = obj.content_item.member_ratings_prefetched
            if not member_ratings:
                return None
            total_score = sum(float(rating.score) for rating in member_ratings)
            count = len(member_ratings)
            return round(total_score / count, 1) if count > 0 else None

        # Last resort: database query
        member_ids = self._get_member_ids(obj)
        member_ratings = Rating.objects.filter(
            content_item=obj.content_item,
            user_id__in=member_ids
        )

        if not member_ratings.exists():
            return None

        total_score = sum(float(rating.score) for rating in member_ratings)
        count = member_ratings.count()
        return round(total_score / count, 1) if count > 0 else None

    def get_member_rating_count(self, obj):
        if obj.status != ListItem.Status.COMPLETED:
            return 0

        if hasattr(obj, 'member_rating_count_annotated'):
            return obj.member_rating_count_annotated or 0

        # Fallback: count from pre-fetched ratings
        if hasattr(obj.content_item, 'member_ratings_prefetched'):
            return len(obj.content_item.member_ratings_prefetched)

        # Last resort: database query
        member_ids = self._get_member_ids(obj)
        return Rating.objects.filter(
            content_item=obj.content_item,
            user_id__in=member_ids
        ).count()

class ListItemCreateSerializer(serializers.ModelSerializer):
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

    content_item = serializers.SerializerMethodField()
    added_by = UserSerializer(read_only=True)

    class Meta:
        model = ListItem

        fields = [
            'id',
            'list_order',
            'source_api',
            'external_id',
            'content_type',
            'content_item',
            'added_by',
            'status',
            'added_at',
            'completed_at',
        ]

        read_only_fields = [
            'id',
            'list_order',
            'content_item',
            'added_by',
            'added_at',
            'completed_at'
        ]

    def get_content_item(self, obj):
        return ContentItemSerializer(obj.content_item, context=self.context).data

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
                raise serializers.ValidationError({'source_api': f"'{source_api}' is not valid for content_type '{content_type}'"})

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

        # Check for duplicate item in the same list
        user_list = validated_data.get('user_list')
        existing_item = ListItem.objects.filter(
            user_list=user_list,
            content_item=content_item
        ).first()

        if existing_item:
            raise DuplicateItemException(
                existing_item_id=existing_item.id,
                existing_item={
                    'id': existing_item.id,
                    'added_at': existing_item.added_at.isoformat(),
                    'status': existing_item.status
                }
            )

        list_item = ListItem.objects.create(
            content_item=content_item,
            **validated_data
        )

        return list_item
