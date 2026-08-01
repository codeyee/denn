from rest_framework import serializers

from content.models import UserContentTracking
from content.serializers.local_content_summary import LocalContentSummarySerializer


class TrackingStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=UserContentTracking.Status.choices)
    acknowledge_effects = serializers.BooleanField(required=False, default=False)


class TrackingFavoriteSerializer(serializers.Serializer):
    is_favorite = serializers.BooleanField()


class RandomSelectionRequestSerializer(serializers.Serializer):
    exclude_content_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        max_length=20,
        default=list,
    )


class RandomTrackingPickSerializer(serializers.Serializer):
    tracking_id = serializers.IntegerField(source="id")
    content = LocalContentSummarySerializer(source="content_item")
    status = serializers.CharField()
    last_completed_at = serializers.DateTimeField(allow_null=True)
    is_favorite = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    progress_policy = serializers.SerializerMethodField()

    def get_progress_policy(self, obj):
        from content.services.progress_policy import get_progress_policy

        return get_progress_policy(obj.content_item.content_type)


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
