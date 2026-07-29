from django.contrib.auth.models import User
from django.core.validators import URLValidator
from rest_framework import serializers

from authentication.models import UserPreferences, UserPublicProfile
from content.models import Image, UserContentTracking


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
    banner_content_id = serializers.IntegerField(
        source="banner_content_item_id",
        allow_null=True,
        read_only=True,
    )
    banner_image_id = serializers.IntegerField(
        allow_null=True,
        read_only=True,
    )

    class Meta:
        model = UserPublicProfile
        fields = [
            "username",
            "bio",
            "avatar_url",
            "joined_at",
            "banner_content_id",
            "banner_image_id",
        ]


class UserPublicProfileEditSerializer(serializers.ModelSerializer):
    avatar_url = serializers.URLField(
        allow_blank=True,
        max_length=2048,
        required=False,
        validators=[URLValidator(schemes=["https"])],
    )
    banner_content_id = serializers.IntegerField(
        source="banner_content_item_id",
        allow_null=True,
        required=False,
    )
    banner_image_id = serializers.IntegerField(
        allow_null=True,
        required=False,
    )

    class Meta:
        model = UserPublicProfile
        fields = [
            "bio",
            "avatar_url",
            "banner_content_id",
            "banner_image_id",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def validate(self, attrs):
        profile = self.instance
        content_id = attrs.get(
            "banner_content_item_id",
            profile.banner_content_item_id if profile else None,
        )
        image_id = attrs.get(
            "banner_image_id",
            profile.banner_image_id if profile else None,
        )

        if content_id is None:
            if image_id is not None:
                raise serializers.ValidationError({
                    "banner_image_id": (
                        "Choose a favorite before choosing a banner image."
                    ),
                })
            attrs["banner_image_id"] = None
            return attrs

        user = self.context["request"].user
        is_favorite = UserContentTracking.objects.filter(
            user=user,
            content_item_id=content_id,
            status=UserContentTracking.Status.COMPLETED,
            is_favorite=True,
        ).exists()
        if not is_favorite:
            raise serializers.ValidationError({
                "banner_content_id": "Choose one of your active favorites.",
            })

        if image_id is not None:
            image_exists = Image.objects.filter(
                pk=image_id,
                content_item_id=content_id,
            ).exists()
            if not image_exists:
                raise serializers.ValidationError({
                    "banner_image_id": "Choose an image from that favorite.",
                })
        elif "banner_content_item_id" in attrs:
            attrs["banner_image_id"] = None

        return attrs
