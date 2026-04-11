from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Prefetch, Count, Subquery, Avg
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from content.models import UserList, ListItem, Rating, ContentItem
from content.serializers import (
    UserListSerializer,
    UserListDetailSerializer,
    BulkCheckRequestSerializer,
    BulkCheckResponseSerializer,
)
from content.permissions import IsOwnerOrReadOnly
from content.services.list_service import get_list_stats
from content.services.bulk_check_service import check_items_in_lists, ensure_content_items

from rest_flex_fields.views import FlexFieldsMixin

@extend_schema_view(
    list=extend_schema(
        tags=['Lists Management'],
        summary='List all user lists',
        description='''
        Get all lists where the user is the owner or a member.

        **Optional Query Parameters:**
        - `items_size`: Number of items to include per list (0 or not set = don't fetch items, >0 = fetch that many items, default: 0)
        - `country`: ISO 3166-1 alpha-2 country code (e.g., US, GB, FR) to filter providers by country (only applies when source_api=tmdb).

        **Item Filtering (Performance Optimization):**
        - `filter_external_id`: Filter items by external_id
        - `filter_source_api`: Filter items by source API - case insensitive
        - `filter_content_type`: Filter items by content type - case insensitive

        When item filters are provided, only items matching ALL criteria (logical AND) will be included.

        **Dynamic Fields (drf-flex-fields):**
        - `fields`: Comma-separated list of fields to include
        - `omit`: Comma-separated list of fields to exclude
        - `expand`: Comma-separated list of relationships to expand
        ''',
        parameters=[
            OpenApiParameter('items_size', OpenApiTypes.INT, OpenApiParameter.QUERY, required=False, description='Number of items to include per list (0 or not set = no items, >0 = fetch that many items, default: 0)'),
            OpenApiParameter('country', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='ISO 3166-1 alpha-2 country code'),
            OpenApiParameter('filter_external_id', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Filter items by external_id'),
            OpenApiParameter('filter_source_api', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Filter items by source API - case insensitive'),
            OpenApiParameter('filter_content_type', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Filter items by content type - case insensitive'),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include'),
            OpenApiParameter('omit', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to exclude'),
            OpenApiParameter('expand', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of relationships to expand'),
        ],
        responses={200: UserListSerializer(many=True)}
    ),
    retrieve=extend_schema(
        tags=['Lists Management'],
        summary='Get list details',
        description='''
        Get detailed information about a specific list including all items and members.

        **Optional Query Parameters:**
        - `country`: ISO 3166-1 alpha-2 country code

        **Dynamic Fields (drf-flex-fields):**
        - `fields`, `omit`, `expand`
        ''',
        parameters=[
            OpenApiParameter('country', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='ISO 3166-1 alpha-2 country code'),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
            OpenApiParameter('omit', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
            OpenApiParameter('expand', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        ],
        responses={
            200: UserListDetailSerializer,
            403: OpenApiExample('Forbidden', value={'detail': 'You do not have permission to view this list.'}),
            404: OpenApiExample('Not Found', value={'detail': 'List not found.'})
        }
    ),
    create=extend_schema(
        tags=['Lists Management'],
        summary='Create a new list',
        description='Create a new personal or shared list. The creator becomes the owner.',
        request=UserListSerializer,
        responses={201: UserListSerializer},
        examples=[
            OpenApiExample(
                'Personal List',
                value={'name': 'My Favorite Movies', 'description': 'Movies I love', 'list_type': 'PERSONAL'},
                request_only=True
            ),
            OpenApiExample(
                'Shared List',
                value={'name': 'Family Movies', 'description': 'Movies to watch together', 'list_type': 'SHARED'},
                request_only=True
            )
        ]
    ),
    update=extend_schema(tags=['Lists Management'], summary='Update a list', request=UserListSerializer, responses={200: UserListSerializer}),
    partial_update=extend_schema(tags=['Lists Management'], summary='Partially update a list', request=UserListSerializer, responses={200: UserListSerializer}),
    destroy=extend_schema(tags=['Lists Management'], summary='Delete a list', responses={204: None}),
)
class UserListViewSet(FlexFieldsMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    permit_list_expands = ['owner', 'items', 'members']

    def _parse_item_filters(self):
        """Build filter dict for ListItem queryset from query params."""
        filters = {}
        val = self.request.query_params.get('filter_external_id')
        if val:
            filters['content_item__external_id'] = val
        val = self.request.query_params.get('filter_source_api')
        if val:
            filters['content_item__source_api'] = val.lower()
        val = self.request.query_params.get('filter_content_type')
        if val:
            filters['content_item__content_type'] = val.upper()
        return filters

    def get_queryset(self):
        user = self.request.user
        item_filters = self._parse_item_filters()
        user_list_id = self.kwargs.get('pk')

        if user_list_id:
            member_ids_sq = Subquery(
                UserList.objects.filter(pk=user_list_id).values('members__id')
            )
            owner_id_sq = Subquery(
                UserList.objects.filter(pk=user_list_id).values('owner_id')[:1]
            )
            ratings_qs = Rating.objects.filter(
                Q(user_id__in=member_ids_sq) | Q(user_id=owner_id_sq)
            ).select_related('user').order_by('-created_at')
        else:
            ratings_qs = Rating.objects.select_related('user').order_by('-created_at')

        items_qs = ListItem.objects.filter(**item_filters).select_related(
            'content_item',
            'added_by',
        ).prefetch_related(
            Prefetch(
                'content_item__ratings',
                queryset=ratings_qs,
                to_attr='member_ratings_prefetched',
            )
        ).order_by('list_order', '-added_at')

        return UserList.objects.filter(
            Q(owner=user) | Q(members=user)
        ).distinct().select_related(
            'owner'
        ).prefetch_related(
            'members',
            Prefetch('items', queryset=items_qs),
        ).annotate(
            item_count_annotated=Count('items', distinct=True),
            member_count_annotated=Count('members', distinct=True),
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserListDetailSerializer
        if self.action == 'list':
            items_size = self.request.query_params.get('items_size', '0')
            try:
                if int(items_size) > 0:
                    return UserListDetailSerializer
            except (ValueError, TypeError):
                pass
        return UserListSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.action in ['list', 'retrieve']:
            items_size = self.request.query_params.get('items_size')
            if items_size is not None:
                try:
                    items_size = int(items_size)
                    if items_size > 0:
                        context['items_size'] = items_size
                except (ValueError, TypeError):
                    pass
            elif self.action == 'retrieve':
                context['items_size'] = 100
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy', 'retrieve']:
            return [IsAuthenticated(), IsOwnerOrReadOnly()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    # ── Stats ────────────────────────────────────────────────────────
    @extend_schema(
        tags=['Lists Management'],
        summary='Get list statistics',
        description='Get statistics about a list including item counts by status and content type.',
        responses={200: OpenApiExample('Statistics', value={
            'total_items': 15, 'pending_items': 8, 'completed_items': 7,
            'member_count': 3, 'content_types': {'MOVIE': 10, 'TV_SHOW': 5}
        })},
    )
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        user_list = self.get_object()

        is_owner = user_list.owner == request.user
        is_member = user_list.members.filter(id=request.user.id).exists()
        if not (is_owner or is_member):
            return Response(
                {'detail': 'No tienes permiso para ver las estadísticas de esta lista.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(get_list_stats(user_list))

    # ── Bulk Check (read-only) ───────────────────────────────────────
    @extend_schema(
        tags=['Lists Management'],
        summary='Bulk check items across lists',
        description='''
        Check if multiple items exist in any of the user's lists.
        This is a **read-only** operation: it never creates ContentItem rows.
        Items not yet in the database simply won't match.

        **Request:** max 100 items, each with external_id, source_api, content_type.
        **Response:** ALL user lists with match counts and matched_items arrays.
        ''',
        request=BulkCheckRequestSerializer,
        responses={200: BulkCheckResponseSerializer},
    )
    @action(detail=False, methods=['post'], url_path='bulk-check')
    def bulk_check(self, request):
        serializer = BulkCheckRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = check_items_in_lists(request.user, serializer.validated_data['items'])

        response_serializer = BulkCheckResponseSerializer(result)
        return Response(response_serializer.data)

    # ── Bulk Ensure (mutating) ───────────────────────────────────────
    @extend_schema(
        tags=['Lists Management'],
        summary='Bulk ensure content items exist',
        description='''
        Get-or-create ContentItem rows for the given items, then check which lists contain them.
        Use this when you explicitly want to create canonical items before adding them to lists.
        ''',
        request=BulkCheckRequestSerializer,
        responses={200: BulkCheckResponseSerializer},
    )
    @action(detail=False, methods=['post'], url_path='bulk-ensure')
    def bulk_ensure(self, request):
        serializer = BulkCheckRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items_data = serializer.validated_data['items']
        ensure_content_items(items_data)

        result = check_items_in_lists(request.user, items_data)
        response_serializer = BulkCheckResponseSerializer(result)
        return Response(response_serializer.data)
