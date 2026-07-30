from rest_framework import serializers
from content.models import ListMembership, UserList
from .user import UserSerializer, MemberSerializer
from content.services.list_policy import ALL_MEMBER_ROLES, effective_memberships


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
            'dynamic_key',
            'visibility',
            'owner',
            'member_count',
            'item_count',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'owner',
            'dynamic_key',
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
            return obj.member_count_annotated
        return len(effective_memberships(obj))

    def get_item_count(self, obj):
        if hasattr(obj, 'item_count_annotated'):
            return obj.item_count_annotated
        return obj.items.count()

    def validate_list_type(self, value):
        if value == UserList.ListType.DYNAMIC:
            raise serializers.ValidationError(
                "Dynamic lists are created and maintained by the system."
            )
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
            'dynamic_key',
            'visibility',
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
            'dynamic_key',
            'members',
            'created_at',
            'updated_at',
        ]

    def get_members(self, obj):
        """Return all persisted memberships with their explicit roles."""
        memberships = getattr(obj, 'memberships_prefetched', None)
        if memberships is None:
            memberships = list(effective_memberships(obj))
        elif obj.list_type == UserList.ListType.DYNAMIC:
            memberships = []
        elif obj.list_type == UserList.ListType.SHARED:
            memberships = [
                membership
                for membership in memberships
                if membership.role in ALL_MEMBER_ROLES
            ]
        else:
            memberships = [
                membership
                for membership in memberships
                if membership.user_id == obj.owner_id
                and membership.role == 'OWNER'
            ]
        membership_roles = {membership.user_id: membership.role for membership in memberships}
        return MemberSerializer(
            [membership.user for membership in memberships],
            many=True,
            context={'user_list': obj, 'membership_roles': membership_roles}
        ).data

    def get_member_count(self, obj):
        if hasattr(obj, 'member_count_annotated'):
            return obj.member_count_annotated
        return len(effective_memberships(obj))

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
        from content.services.source_data_orchestrator import fetch_bulk_source_data

        # The view prefetches this relation in display order. Reordering here
        # would discard that cache and repeat every nested prefetch.
        items = obj.items.all()

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
            child_context['source_data_cache'] = fetch_bulk_source_data(
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
