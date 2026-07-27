from rest_framework import serializers

from content.models import UserContentTracking


class TrackingStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=UserContentTracking.Status.choices)
    acknowledge_effects = serializers.BooleanField(required=False, default=False)


class TrackingFavoriteSerializer(serializers.Serializer):
    is_favorite = serializers.BooleanField()


class UserContentTrackingSerializer(serializers.ModelSerializer):
    content_id = serializers.IntegerField(source="content_item_id")
    should_prompt_rating = serializers.BooleanField(read_only=True, default=False)
    effects = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
        default=list,
    )

    class Meta:
        model = UserContentTracking
        fields = [
            "content_id",
            "status",
            "last_completed_at",
            "is_favorite",
            "favorited_at",
            "created_at",
            "updated_at",
            "should_prompt_rating",
            "effects",
        ]
        read_only_fields = fields
