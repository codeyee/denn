from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Q
from authentication.models import UserPreferences
from content.models import UserList, Rating
from content.serializers import UserListSerializer, RatingSerializer


class ProfileSerializer(serializers.ModelSerializer):
    lists = serializers.SerializerMethodField()
    ratings = serializers.SerializerMethodField()
    lists_count = serializers.SerializerMethodField()
    ratings_count = serializers.SerializerMethodField()
    allow_adult_content = serializers.BooleanField(
        source='preferences.allow_adult_content',
        required=False,
        default=False,
    )

    class Meta:
        model = User

        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'lists',
            'ratings',
            'lists_count',
            'ratings_count',
            'allow_adult_content',
        ]

        read_only_fields = ['id']

    def get_lists(self, obj):
        q_filter = Q(owner=obj) | Q(members=obj)
        user_lists = UserList.objects.filter(q_filter).distinct().prefetch_related(
            'members',
            'items__content_item',
            'items__added_by'
        ).order_by('-created_at')

        return UserListSerializer(user_lists, many=True, context=self.context).data

    def get_ratings(self, obj):
        user_ratings = Rating.objects.filter(user=obj).select_related('content_item').order_by('-created_at')
        return RatingSerializer(user_ratings, many=True, context=self.context).data

    def get_lists_count(self, obj):
        q_filter = Q(owner=obj) | Q(members=obj)
        return UserList.objects.filter(q_filter).distinct().count()

    def get_ratings_count(self, obj):
        return Rating.objects.filter(user=obj).count()

    def update(self, instance, validated_data):
        preferences = validated_data.pop('preferences', None)
        user = super().update(instance, validated_data)

        if preferences and 'allow_adult_content' in preferences:
            preference, _ = UserPreferences.objects.update_or_create(
                user=user,
                defaults={
                    'allow_adult_content': preferences['allow_adult_content'],
                },
            )
            user.preferences = preference

        return user
