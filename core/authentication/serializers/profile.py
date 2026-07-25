from django.contrib.auth.models import User
from django.core.validators import URLValidator
from rest_framework import serializers

from authentication.models import UserPreferences, UserPublicProfile


class ProfileSerializer(serializers.ModelSerializer):
    allow_adult_content = serializers.BooleanField(
        source="preferences.allow_adult_content",
        required=False,
        default=False,
    )
    bio = serializers.CharField(source="public_profile.bio", read_only=True)
    avatar_url = serializers.URLField(
        source="public_profile.avatar_url",
        read_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "allow_adult_content",
            "bio",
            "avatar_url",
        ]
        read_only_fields = ["id", "username", "bio", "avatar_url"]

    def update(self, instance, validated_data):
        preferences = validated_data.pop("preferences", None)
        user = super().update(instance, validated_data)
        if preferences and "allow_adult_content" in preferences:
            preference, _created = UserPreferences.objects.update_or_create(
                user=user,
                defaults={
                    "allow_adult_content": preferences["allow_adult_content"],
                },
            )
            user.preferences = preference
        return user


class PublicProfileIdentitySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username")
    joined_at = serializers.DateTimeField(source="user.date_joined")

    class Meta:
        model = UserPublicProfile
        fields = [
            "username",
            "bio",
            "avatar_url",
            "joined_at",
        ]


class UserPublicProfileEditSerializer(serializers.ModelSerializer):
    avatar_url = serializers.URLField(
        allow_blank=True,
        max_length=2048,
        required=False,
        validators=[URLValidator(schemes=["https"])],
    )

    class Meta:
        model = UserPublicProfile
        fields = ["bio", "avatar_url", "updated_at"]
        read_only_fields = ["updated_at"]
