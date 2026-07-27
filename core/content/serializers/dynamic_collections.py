from rest_framework import serializers

from content.serializers.local_content_summary import LocalContentSummarySerializer


class DynamicCollectionSerializer(serializers.Serializer):
    key = serializers.CharField()
    list_id = serializers.IntegerField()
    name = serializers.CharField()
    group = serializers.ChoiceField(choices=("status", "type"))
    item_count = serializers.IntegerField()
    enabled = serializers.BooleanField()
    random_enabled = serializers.BooleanField()
    cover_images = serializers.ListField(child=serializers.URLField())


class DynamicCollectionItemSerializer(serializers.Serializer):
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


class DynamicCollectionChangeSerializer(serializers.Serializer):
    key = serializers.CharField()
    enabled = serializers.BooleanField()


class DynamicCollectionSettingsSerializer(serializers.Serializer):
    enabled = serializers.BooleanField(required=False)
    collections = DynamicCollectionChangeSerializer(many=True, required=False)

    def validate_collections(self, value):
        from content.services.dynamic_collections import COLLECTION_BY_KEY

        keys = [change["key"] for change in value]
        if len(set(keys)) != len(keys):
            raise serializers.ValidationError("Collection keys must be unique.")
        invalid = [key for key in keys if key not in COLLECTION_BY_KEY]
        if invalid:
            raise serializers.ValidationError(
                f"Unknown collection keys: {', '.join(invalid)}",
            )
        return value
