from rest_framework import serializers
from django.contrib.auth.models import User

from content.models import ListMembership

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id', 'username', 'email']


class MemberSerializer(serializers.ModelSerializer):
    """Serializer for list members with is_owner flag"""
    is_owner = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_owner', 'role']
        read_only_fields = ['id', 'username', 'email']

    def get_is_owner(self, obj):
        """Determine if this user is the owner of the list"""
        user_list = self.context.get('user_list')
        if user_list:
            return obj.id == user_list.owner.id
        return False

    def get_role(self, obj):
        roles = self.context.get('membership_roles', {})
        role = roles.get(obj.id)
        if role is None:
            user_list = self.context.get('user_list')
            if user_list and user_list.owner_id == obj.id:
                role = ListMembership.Role.OWNER
            elif user_list:
                role = (
                    user_list.memberships.filter(user_id=obj.id)
                    .values_list('role', flat=True)
                    .first()
                )
        return role.lower() if role else None


class ListMembershipSerializer(serializers.ModelSerializer):
    """Flat authenticated representation of a membership and its role."""

    id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    role = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = ListMembership
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'is_owner',
        ]

    def get_role(self, obj):
        return obj.role.lower()

    def get_is_owner(self, obj):
        return obj.role == ListMembership.Role.OWNER


class ListMembershipRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=[
            ('editor', 'Editor'),
            ('viewer', 'Viewer'),
        ]
    )
