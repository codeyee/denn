from rest_framework import serializers
from django.contrib.auth.models import User

from core.serializers import BaseFlexSerializer


class UserSerializer(BaseFlexSerializer):
    allow_adult_content = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'allow_adult_content',
        ]
        read_only_fields = ['id']

    def get_allow_adult_content(self, obj):
        preferences = getattr(obj, 'preferences', None)
        return bool(preferences and preferences.allow_adult_content)
