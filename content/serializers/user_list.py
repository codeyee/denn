from rest_framework import serializers
from content.models import UserList
from .user import UserSerializer, MemberSerializer


from core.serializers import BaseFlexSerializer

class UserListSerializer(BaseFlexSerializer):
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

        expandable_fields = {
            'owner': (UserSerializer, {'many': False}),
            'items': ('content.serializers.ListItemSerializer', {'many': True}),
            'members': (MemberSerializer, {'many': True}),
        }

    def get_member_count(self, obj):
        if hasattr(obj, 'member_count_annotated'):
            count = obj.member_count_annotated
            if hasattr(obj, '_prefetched_objects_cache') and 'members' in obj._prefetched_objects_cache:
                if obj.owner_id not in [m.id for m in obj.members.all()]:
                    count += 1
            return count
        count = obj.members.count()
        if not obj.members.filter(id=obj.owner_id).exists():
            count += 1
        return count

    def get_item_count(self, obj):
        if hasattr(obj, 'item_count_annotated'):
            return obj.item_count_annotated
        return obj.items.count()

    def validate_list_type(self, value):
        if self.instance and self.instance.list_type != value:
            raise serializers.ValidationError("Cannot change the list type after creation.")

        return value

class UserListDetailSerializer(BaseFlexSerializer):
    owner = UserSerializer(read_only=True)
    members = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = UserList

        fields = [
            'id',
            'name',
            'description',
            'list_type',
            'owner',
            'members',
            'member_count',
            'items',
            'item_count',
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

    def get_members(self, obj):
        """Return all members including the owner with is_owner flag"""
        # Get all existing members
        members_qs = obj.members.all()

        # Check if owner is already in members
        member_ids = list(members_qs.values_list('id', flat=True))

        # If owner is not in members, add them
        if obj.owner.id not in member_ids:
            # Combine owner with existing members
            from django.contrib.auth.models import User
            members_list = list(members_qs)
            members_list.insert(0, obj.owner)  # Add owner at the beginning
        else:
            members_list = list(members_qs)

        # Serialize with context containing the user_list for is_owner calculation
        return MemberSerializer(
            members_list,
            many=True,
            context={'user_list': obj}
        ).data

    def get_member_count(self, obj):
        if hasattr(obj, 'member_count_annotated'):
            count = obj.member_count_annotated
            if hasattr(obj, '_prefetched_objects_cache') and 'members' in obj._prefetched_objects_cache:
                if obj.owner_id not in [m.id for m in obj.members.all()]:
                    count += 1
            return count
        count = obj.members.count()
        if not obj.members.filter(id=obj.owner_id).exists():
            count += 1
        return count

    def get_item_count(self, obj):
        if hasattr(obj, 'item_count_annotated'):
            return obj.item_count_annotated
        return obj.items.count()

    def _wants_source_data(self):
        request = self.context.get('request')
        if not request:
            return False
        if request.query_params.get('include_source_data', '').lower() in ('true', '1'):
            return True
        if request.query_params.get('source_fields'):
            return True
        expand = request.query_params.get('expand', '')
        if 'content_item' in expand or 'source_data' in expand:
            return True
        return False

    def get_items(self, obj):
        from .list_item import ListItemSerializer
        from content.utils import bulk_fetch_source_data

        items = obj.items.all().order_by('list_order', '-added_at')

        items_size = self.context.get('items_size')
        if items_size is not None:
            try:
                items_size = int(items_size)
                if items_size > 0:
                    items = items[:items_size]
            except (ValueError, TypeError):
                pass

        child_context = {**self.context}

        if self._wants_source_data():
            request = self.context.get('request')
            country_code = request.query_params.get('country') if request else None
            content_items = [item.content_item for item in items]
            child_context['source_data_cache'] = bulk_fetch_source_data(
                content_items, country_code=country_code,
            )

        kwargs = {'context': child_context}

        request = self.context.get('request')
        if request:
            query_fields = request.query_params.get('fields')
            if query_fields:
                fields = [f[6:] for f in query_fields.split(',') if f.strip().startswith('items.')]
                if fields:
                    kwargs['fields'] = fields
            query_expand = request.query_params.get('expand')
            if query_expand:
                expand = [f[6:] for f in query_expand.split(',') if f.strip().startswith('items.')]
                if expand:
                    kwargs['expand'] = expand

        return ListItemSerializer(items, many=True, **kwargs).data
