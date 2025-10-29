from rest_framework import serializers
from content.models import UserList
from .user import UserSerializer


class UserListSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = UserList

        fields = [
            'id',
            'name',
            'description',
            'list_type',
            'owner',
            'member_count',
            'item_count',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'owner',
            'created_at',
            'updated_at',
        ]

    def get_member_count(self, obj):
        return obj.members.count()

    def get_item_count(self, obj):
        return obj.items.count()

    def validate_list_type(self, value):
        if self.instance and self.instance.list_type != value:
            raise serializers.ValidationError("Cannot change the list type after creation.")

        return value

class UserListDetailSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members = UserSerializer(many=True, read_only=True)
    items = serializers.SerializerMethodField()

    class Meta:
        model = UserList

        fields = [
            'id',
            'name',
            'description',
            'list_type',
            'owner',
            'members',
            'items',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'owner',
            'members',
            'created_at',
            'updated_at',
        ]

    def get_items(self, obj):
        from .list_item import ListItemSerializer
        return ListItemSerializer(obj.items.all(), many=True, context=self.context).data
