from rest_framework import serializers
from django.contrib.auth.models import User

from core.serializers import BaseFlexSerializer

class UserSerializer(BaseFlexSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']
