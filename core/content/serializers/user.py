from rest_framework import serializers
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id', 'username', 'email']


class MemberSerializer(serializers.ModelSerializer):
    """Serializer for list members with is_owner flag"""
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_owner']
        read_only_fields = ['id', 'username', 'email']

    def get_is_owner(self, obj):
        """Determine if this user is the owner of the list"""
        user_list = self.context.get('user_list')
        if user_list:
            return obj.id == user_list.owner.id
        return False

