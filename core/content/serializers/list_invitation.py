from rest_framework import serializers
from content.models import ListInvitation, UserList
from django.contrib.auth.models import User
from .user import UserSerializer
from .user_list import UserListSerializer
from core.serializers import BaseFlexSerializer

class ListInvitationSerializer(BaseFlexSerializer):
    inviter = UserSerializer(read_only=True)
    invitee = UserSerializer(read_only=True)
    user_list = UserListSerializer(read_only=True)
    role = serializers.SerializerMethodField()

    class Meta:
        model = ListInvitation

        fields = [
            'id',
            'user_list',
            'inviter',
            'invitee',
            'status',
            'role',
            'created_at',
            'responded_at',
        ]

        read_only_fields = [
            'id',
            'user_list',
            'inviter',
            'invitee',
            'status',
            'created_at',
            'responded_at',
        ]

        expandable_fields = {
            'inviter': (UserSerializer, {'many': False}),
            'invitee': (UserSerializer, {'many': False}),
            'user_list': (UserListSerializer, {'many': False}),
        }

    def get_role(self, obj):
        return obj.role.lower()

class ListInvitationCreateSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        write_only=True,
        required=False,
        help_text='Username of the user to invite'
    )

    email = serializers.EmailField(
        write_only=True,
        required=False,
        help_text='Email of the user to invite'
    )

    role = serializers.ChoiceField(
        choices=[
            ('editor', 'Editor'),
            ('viewer', 'Viewer'),
        ],
        required=False,
        default='editor',
        write_only=True,
    )

    inviter = UserSerializer(read_only=True)
    invitee = UserSerializer(read_only=True)
    user_list = UserListSerializer(read_only=True)

    class Meta:
        model = ListInvitation

        fields = [
            'id',
            'username',
            'email',
            'user_list',
            'inviter',
            'invitee',
            'status',
            'created_at',
            'responded_at',
            'role',
        ]

        read_only_fields = [
            'id',
            'user_list',
            'inviter',
            'invitee',
            'status',
            'created_at',
            'responded_at',
        ]

    def validate(self, attrs):
        username = attrs.get('username')
        email = attrs.get('email')

        if not username and not email:
            raise serializers.ValidationError(
                {'detail': 'You must provide username or email.'}
            )

        try:
            if username: invitee = User.objects.get(username=username)
            else: invitee = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {'detail': 'User not found.'}
            )

        attrs['invitee'] = invitee
        attrs['role'] = attrs.get('role', 'editor').upper()

        request = self.context.get('request')
        if request and invitee.id == request.user.id:
            raise serializers.ValidationError(
                {'detail': 'You cannot invite yourself.'}
            )

        user_list = self.context.get('user_list')
        if user_list and user_list.memberships.filter(user_id=invitee.id).exists():
            raise serializers.ValidationError(
                {'detail': f'User {invitee.username} is already a member of this list.'}
            )

        if user_list and ListInvitation.objects.filter(
            user_list=user_list,
            invitee=invitee,
            status=ListInvitation.Status.PENDING
        ).exists():
            raise serializers.ValidationError(
                {'detail': f'User {invitee.username} already has a pending invitation to this list.'}
            )

        return attrs

    def create(self, validated_data):
        validated_data.pop('username', None)
        validated_data.pop('email', None)

        invitation = ListInvitation.objects.create(**validated_data)
        return invitation


class ListInvitationResponseSerializer(serializers.ModelSerializer):
    action = serializers.ChoiceField(
        choices=['accept', 'reject'],
        write_only=True,
        help_text='Accept or reject the invitation'
    )

    class Meta:
        model = ListInvitation

        fields = [
            'id',
            'action',
            'status',
            'responded_at',
        ]

        read_only_fields = [
            'id',
            'status',
            'responded_at',
        ]
