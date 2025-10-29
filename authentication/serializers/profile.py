from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Q
from content.models import UserList, Rating
from content.serializers import UserListSerializer, RatingSerializer

class ProfileSerializer(serializers.ModelSerializer):
    lists = serializers.SerializerMethodField()
    ratings = serializers.SerializerMethodField()
    lists_count = serializers.SerializerMethodField()
    ratings_count = serializers.SerializerMethodField()

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
            'ratings_count'
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
