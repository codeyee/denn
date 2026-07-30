from types import SimpleNamespace

from django.db import transaction
from rest_framework import serializers
from content.models import ContentItem, ListItem, ListMembership, Rating, UserList
from content.services.list_policy import ALL_MEMBER_ROLES, effective_member_ids
from content.services.tracking_service import ensure_tracking
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
            'context_status',
            'added_at',
            'context_completed_at',
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
            'context_completed_at',
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
        context = self.context
        personal_tracking_status = getattr(
            obj,
            "personal_tracking_status",
            None,
        )
        if personal_tracking_status is not None:
            context = {
                **self.context,
                "current_user_tracking": SimpleNamespace(
                    content_item_id=obj.personal_tracking_content_id,
                    status=personal_tracking_status,
                    last_completed_at=obj.personal_tracking_last_completed_at,
                    is_favorite=obj.personal_tracking_is_favorite,
                    favorited_at=obj.personal_tracking_favorited_at,
                    created_at=obj.personal_tracking_created_at,
                    updated_at=obj.personal_tracking_updated_at,
                ),
            }
        kwargs = {'context': context}
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

    def validate(self, attrs):
        if (
            self.instance
            and self.instance.user_list.list_type
            == self.instance.user_list.ListType.PERSONAL
            and attrs.get("context_status") is not None
        ):
            raise serializers.ValidationError({
                "context_status": (
                    "Personal lists use the content tracking progress state."
                )
            })
        return attrs

    def _get_member_ids(self, obj):
        """
        Helper to get all member IDs including owner.
        Uses prefetch cache when available to avoid extra queries.
        """
        # Use prefetch cache if available
        memberships = getattr(obj.user_list, 'memberships_prefetched', None)
        if memberships is not None:
            if obj.user_list.list_type == UserList.ListType.SHARED:
                member_ids = [
                    membership.user_id
                    for membership in memberships
                    if membership.role in ALL_MEMBER_ROLES
                ]
            elif obj.user_list.list_type == UserList.ListType.PERSONAL:
                member_ids = [
                    membership.user_id
                    for membership in memberships
                    if membership.user_id == obj.user_list.owner_id
                    and membership.role == ListMembership.Role.OWNER
                ]
            else:
                member_ids = []
        else:
            member_ids = effective_member_ids(obj.user_list_id)

        return member_ids

    def get_member_ratings(self, obj):
        if not self._ratings_are_visible(obj):
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
            user_id__in=member_ids,
            is_active=True,
        ).select_related('user')

        return MemberRatingSerializer(
            member_ratings,
            many=True,
            context={'user_list': obj.user_list}
        ).data

    def get_list_rating(self, obj):
        if not self._ratings_are_visible(obj):
            return None

        if hasattr(obj, 'member_rating_avg_annotated'):
            avg = obj.member_rating_avg_annotated
            return round(float(avg), 1) if avg is not None else None

        if hasattr(obj.content_item, 'member_ratings_prefetched'):
            member_ratings = obj.content_item.member_ratings_prefetched
            if not member_ratings:
                return None
            total_score = sum(float(r.score) for r in member_ratings)
            return round(total_score / len(member_ratings), 1)

        return None

    def get_member_rating_count(self, obj):
        if not self._ratings_are_visible(obj):
            return 0

        if hasattr(obj, 'member_rating_count_annotated'):
            return obj.member_rating_count_annotated or 0

        if hasattr(obj.content_item, 'member_ratings_prefetched'):
            return len(obj.content_item.member_ratings_prefetched)

        return 0

    def _ratings_are_visible(self, obj):
        if obj.user_list.list_type == obj.user_list.ListType.SHARED:
            return obj.context_status == ListItem.Status.COMPLETED
        return getattr(obj, "personal_tracking_status", None) == "completed"

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
            'context_status',
            'added_at',
            'context_completed_at',
        ]

        read_only_fields = [
            'id',
            'list_order',
            'content_item',
            'added_by',
            'added_at',
            'context_completed_at'
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

    @transaction.atomic
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
        if user_list.list_type == user_list.ListType.PERSONAL:
            validated_data["context_status"] = None
            validated_data["context_completed_at"] = None
        elif validated_data.get("context_status") is None:
            validated_data["context_status"] = ListItem.Status.PENDING
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
                    'context_status': existing_item.context_status
                }
            )

        list_item = ListItem.objects.create(
            content_item=content_item,
            **validated_data
        )
        if user_list.list_type == user_list.ListType.PERSONAL:
            ensure_tracking(
                user=user_list.owner,
                content_item=content_item,
            )

        return list_item
