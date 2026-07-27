from rest_framework import serializers

from content.models import ListItem, UserList

from .local_content_summary import LocalContentSummarySerializer


class PublicListItemSerializer(serializers.ModelSerializer):
    content = LocalContentSummarySerializer(source="content_item")

    class Meta:
        model = ListItem
        fields = [
            "id",
            "list_order",
            "context_status",
            "added_at",
            "context_completed_at",
            "content",
        ]


class PublicUserListDetailSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()
    collaborators = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    items = PublicListItemSerializer(many=True)

    class Meta:
        model = UserList
        fields = [
            "id",
            "name",
            "description",
            "list_type",
            "visibility",
            "owner",
            "collaborators",
            "item_count",
            "items",
            "created_at",
            "updated_at",
        ]

    def get_owner(self, obj) -> dict:
        return {"username": obj.owner.username}

    def get_collaborators(self, obj) -> list:
        return [
            {"username": member.username}
            for member in obj.members.all()
            if member.id != obj.owner_id
        ]

    def get_item_count(self, obj) -> int:
        return len(obj.items.all())
