from rest_framework import serializers
from content.models import ListItem, ContentItem, Rating
from .content_item import ContentItemSerializer
from .user import UserSerializer

class MemberRatingSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Rating
        fields = ['user', 'score', 'comment', 'created_at', 'updated_at']
        read_only_fields = fields

class ListItemSerializer(serializers.ModelSerializer):
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
            'content_item',
            'added_by',
            'status',
            'added_at',
            'completed_at',
            'notes',
            'member_ratings',
            'list_rating',
            'member_rating_count',
        ]

        read_only_fields = [
            'id',
            'user_list',
            'content_item',
            'added_by',
            'added_at',
            'completed_at',
            'member_ratings',
            'list_rating',
            'member_rating_count',
        ]

    def get_content_item(self, obj):
        return ContentItemSerializer(obj.content_item, context=self.context).data

    def get_member_ratings(self, obj):
        if obj.status != ListItem.Status.COMPLETED: return []

        list_members = obj.user_list.members.all()

        member_ratings = Rating.objects.filter(
            content_item=obj.content_item,
            user__in=list_members
        ).select_related('user')

        return MemberRatingSerializer(member_ratings, many=True).data

    def get_list_rating(self, obj):
        if obj.status != ListItem.Status.COMPLETED: return None

        list_members = obj.user_list.members.all()

        member_ratings = Rating.objects.filter(
            content_item=obj.content_item,
            user__in=list_members
        )

        if not member_ratings.exists(): return None

        total_score = sum(float(rating.score) for rating in member_ratings)
        count = member_ratings.count()

        return round(total_score / count, 1) if count > 0 else None

    def get_member_rating_count(self, obj):
        if obj.status != ListItem.Status.COMPLETED: return 0

        list_members = obj.user_list.members.all()

        return Rating.objects.filter(
            content_item=obj.content_item,
            user__in=list_members
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
            'source_api',
            'external_id',
            'content_type',
            'content_item',
            'added_by',
            'status',
            'notes',
            'added_at',
            'completed_at',
        ]

        read_only_fields = [
            'id',
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
            defaults={'content_type': content_type}
        )

        list_item = ListItem.objects.create(
            content_item=content_item,
            **validated_data
        )

        return list_item

