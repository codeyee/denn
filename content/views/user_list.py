from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Prefetch
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from content.models import UserList, ListItem, Rating
from content.serializers import UserListSerializer, UserListDetailSerializer
from content.permissions import IsOwnerOrReadOnly

from rest_flex_fields.views import FlexFieldsMixin

@extend_schema_view(
    list=extend_schema(
        tags=['Lists Management'],
        summary='List all user lists',
        description='''
        Get all lists where the user is the owner or a member.
        Detailed information from external APIs (TMDB, IGDB, Spotify, OpenLibrary) is always included in the `source_data` field of each content item.

        **Optional Query Parameters:**
        - `items_size`: Number of items to include per list (0 or not set = don't fetch items, >0 = fetch that many items, default: 0)
        - `country`: ISO 3166-1 alpha-2 country code (e.g., US, GB, FR) to filter providers by country (only applies when source_api=tmdb).

        **Item Filtering (Performance Optimization):**
        - `filter_external_id`: Filter items by external_id (e.g., "945961" for a movie, "1396:1" for a season)
        - `filter_source_api`: Filter items by source API (e.g., "TMDB", "IGDB", "Spotify", "OpenLibrary") - case insensitive
        - `filter_content_type`: Filter items by content type (e.g., "MOVIE", "TV_SHOW", "SEASON", "GAME", "ALBUM", "BOOK") - case insensitive

        When item filters are provided, only items matching ALL criteria (logical AND) will be included in each list's items array.
        If no items match, the items array will be empty. This dramatically reduces data transfer when checking if specific content exists in user lists.

        **Dynamic Fields (drf-flex-fields):**
        - `fields`: Comma-separated list of fields to include
        - `omit`: Comma-separated list of fields to exclude
        - `expand`: Comma-separated list of relationships to expand

        **Examples:**
        - `?fields=id,name,list_type` - Return only basic list info
        - `?omit=created_at,updated_at` - Exclude timestamp fields
        - `?expand=owner` - Expand owner relationship with full user details
        - `?expand=items&items_size=5` - Expand first 5 items with full details
        - `?expand=owner,members&fields=id,name,owner,members` - Expand relationships and limit fields
        - `?filter_external_id=945961&filter_source_api=TMDB&filter_content_type=MOVIE` - Check if "Alien: Romulus" is in any list
        - `?filter_external_id=1396:1&filter_source_api=TMDB&filter_content_type=SEASON` - Check if "Breaking Bad Season 1" is in any list
        ''',
        parameters=[
            OpenApiParameter('items_size', OpenApiTypes.INT, OpenApiParameter.QUERY, required=False, description='Number of items to include per list (0 or not set = no items, >0 = fetch that many items, default: 0)'),
            OpenApiParameter('country', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='ISO 3166-1 alpha-2 country code to filter providers by country (only applies when source_api=tmdb)'),
            OpenApiParameter('filter_external_id', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Filter items by external_id (e.g., "945961" for a movie, "1396:1" for a season)'),
            OpenApiParameter('filter_source_api', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Filter items by source API (e.g., "TMDB", "IGDB") - case insensitive'),
            OpenApiParameter('filter_content_type', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Filter items by content type (e.g., "MOVIE", "SEASON") - case insensitive'),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include (e.g., "id,name,list_type")'),
            OpenApiParameter('omit', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to exclude (e.g., "created_at,updated_at")'),
            OpenApiParameter('expand', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of relationships to expand (e.g., "owner,items,members")')
        ],
        responses={200: UserListSerializer(many=True)}
    ),
    retrieve=extend_schema(
        tags=['Lists Management'],
        summary='Get list details',
        description='''
        Get detailed information about a specific list including all items and members.
        Detailed information from external APIs (TMDB, IGDB, Spotify, OpenLibrary) is always included in the `source_data` field of each content item.

        **Optional Query Parameters:**
        - `country`: ISO 3166-1 alpha-2 country code (e.g., US, GB, FR) to filter providers by country (only applies when source_api=tmdb).

        **Dynamic Fields (drf-flex-fields):**
        - `fields`: Comma-separated list of fields to include
        - `omit`: Comma-separated list of fields to exclude
        - `expand`: Comma-separated list of relationships to expand

        **Examples:**
        - `?fields=id,name,items` - Return only basic list info with items
        - `?expand=owner,members` - Expand owner and members relationships
        - `?omit=items` - Exclude items from response
        - `?expand=items&fields=id,name,items.id,items.status` - Expand items but limit fields
        ''',
        parameters=[
            OpenApiParameter('country', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='ISO 3166-1 alpha-2 country code to filter providers by country (only applies when source_api=tmdb)'),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include'),
            OpenApiParameter('omit', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to exclude'),
            OpenApiParameter('expand', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of relationships to expand (e.g., "owner,items,members")')
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
                value={
                    'name': 'My Favorite Movies',
                    'description': 'Movies I love',
                    'list_type': 'PERSONAL'
                },
                request_only=True
            ),
            OpenApiExample(
                'Shared List',
                value={
                    'name': 'Family Movies',
                    'description': 'Movies to watch together',
                    'list_type': 'SHARED'
                },
                request_only=True
            )
        ]
    ),
    update=extend_schema(
        tags=['Lists Management'],
        summary='Update a list',
        description='Update list details. Only the owner can update the list.',
        request=UserListSerializer,
        responses={
            200: UserListSerializer,
            403: OpenApiExample('Forbidden', value={'detail': 'You do not have permission to edit this list.'})
        }
    ),
    partial_update=extend_schema(
        tags=['Lists Management'],
        summary='Partially update a list',
        description='Update specific fields of a list. Only the owner can update the list.',
        request=UserListSerializer,
        responses={200: UserListSerializer}
    ),
    destroy=extend_schema(
        tags=['Lists Management'],
        summary='Delete a list',
        description='Delete a list permanently. Only the owner can delete the list.',
        responses={
            204: None,
            403: OpenApiExample('Forbidden', value={'detail': 'You do not have permission to delete this list.'})
        }
    )
)
class UserListViewSet(FlexFieldsMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    permit_list_expands = ['owner', 'items', 'members']

    def get_queryset(self):
        """
        Optimized queryset with prefetch_related and select_related to prevent N+1 queries.

        Optimizations:
        - select_related('owner') - Single JOIN instead of separate query
        - Prefetch('items') - Custom queryset with select_related for foreign keys
        - Prefetch('items__content_item__ratings') - Only ratings from list members
        - Item filtering - Filter items by external_id, source_api, and content_type

        Performance impact:
        - Before: ~40-60 queries (N+1 for items, ratings, users)
        - After: ~5-8 queries (optimized with prefetch)
        """
        user = self.request.user

        # Apply optional item filters for performance optimization
        # When checking if a specific content is in user's lists (e.g., "Add to List" modal),
        # filtering at the database level prevents transferring unnecessary data
        filter_external_id = self.request.query_params.get('filter_external_id')
        filter_source_api = self.request.query_params.get('filter_source_api')
        filter_content_type = self.request.query_params.get('filter_content_type')

        # Build filter dictionary for items (logical AND)
        item_filters = {}
        if filter_external_id:
            item_filters['content_item__external_id'] = filter_external_id
        if filter_source_api:
            # Convert to lowercase to match database storage (e.g., 'TMDB' -> 'tmdb')
            item_filters['content_item__source_api'] = filter_source_api.lower()
        if filter_content_type:
            # Content type is stored in uppercase (e.g., 'MOVIE', 'SEASON')
            item_filters['content_item__content_type'] = filter_content_type.upper()

        # Optimized queryset for list items with all related data
        # We apply filters first, then select_related and order_by
        items_queryset = ListItem.objects.filter(**item_filters).select_related(
            'content_item',  # Avoid extra query for each item's content
            'added_by'       # Avoid extra query for each item's added_by user
        ).order_by('list_order', '-added_at')

        # Build the main queryset with all optimizations
        return UserList.objects.filter(
            Q(owner=user) | Q(members=user)
        ).distinct().select_related(
            'owner'  # Single JOIN for owner instead of N queries
        ).prefetch_related(
            'members',  # Prefetch all members in one query
            Prefetch(
                'items',
                queryset=items_queryset
            ),
            # Note: We intentionally DO NOT prefetch ratings here because:
            # 1. Only COMPLETED items need ratings
            # 2. We only need ratings from list members (not all ratings)
            # 3. The filtering logic is complex and handled in the serializer
            # 4. Pre-fetching all ratings would waste memory/bandwidth
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserListDetailSerializer

        elif self.action == 'list':
            items_size = self.request.query_params.get('items_size', '0')

            try:
                items_size = int(items_size)
                if items_size > 0:
                    return UserListDetailSerializer
            except (ValueError, TypeError):
                pass

        return UserListSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()

        if self.action == 'list':
            items_size = self.request.query_params.get('items_size', '0')

            try:
                items_size = int(items_size)
                if items_size > 0:
                    context['items_size'] = items_size
            except (ValueError, TypeError):
                pass

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
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwnerOrReadOnly()]

        elif self.action == 'retrieve':
            return [IsAuthenticated(), IsOwnerOrReadOnly()]

        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @extend_schema(
        tags=['Lists Management'],
        summary='Get list statistics',
        description='Get statistics about a list including item counts by status and content type.',
        responses={
            200: OpenApiExample(
                'Statistics',
                value={
                    'total_items': 15,
                    'pending_items': 8,
                    'completed_items': 7,
                    'member_count': 3,
                    'content_types': {
                        'MOVIE': 10,
                        'TV_SHOW': 5
                    }
                }
            ),
            403: OpenApiExample('Forbidden', value={'detail': 'No tienes permiso para ver las estadísticas de esta lista.'})
        }
    )
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        user_list = self.get_object()

        # Check if user is owner or member
        is_owner = user_list.owner == request.user
        is_member = user_list.members.filter(id=request.user.id).exists()

        if not (is_owner or is_member):
            return Response(
                {'detail': 'No tienes permiso para ver las estadísticas de esta lista.'},
                status=status.HTTP_403_FORBIDDEN
            )

        stats = {
            'total_items': user_list.items.count(),
            'pending_items': user_list.items.filter(status='PENDING').count(),
            'completed_items': user_list.items.filter(status='COMPLETED').count(),
            'member_count': user_list.members.count(),
            'content_types': {}
        }

        for item in user_list.items.all():
            content_type = item.content_item.content_type

            if content_type not in stats['content_types']:
                stats['content_types'][content_type] = 0

            stats['content_types'][content_type] += 1

        return Response(stats)
