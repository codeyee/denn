from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import F, Prefetch, Subquery
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from content.models import ListItem, UserList, Rating
from content.serializers import ListItemSerializer, ListItemCreateSerializer
from content.permissions import IsMemberOfList
from content.utils import bulk_fetch_source_data

from rest_flex_fields.views import FlexFieldsMixin

@extend_schema_view(
    list=extend_schema(
        tags=['List Items'],
        summary='List all items in a list',
        description='''
        Get all items in a specific list. Only members of the list can view its items.
        Detailed information from external APIs (TMDB, IGDB, Spotify, OpenLibrary) is always included in the `source_data` field of each content item.

        **Optional Query Parameters:**
        - `country`: ISO 3166-1 alpha-2 country code (e.g., US, GB, FR) to filter providers by country (only applies when source_api=tmdb).
        - `page`: Page number (default: 1)
        - `page_size`: Number of items per page (default: 20, max: 100). Set to 0 to fetch all items without pagination.

        **Dynamic Fields (drf-flex-fields):**
        - `fields`: Comma-separated list of fields to include
        - `omit`: Comma-separated list of fields to exclude
        - `expand`: Comma-separated list of relationships to expand (e.g., `content_item`, `user_list`, `added_by`)
        - `source_fields`: Comma-separated list of fields to include from external API data (supports dot notation)

        **Pagination:**
        - Default: 20 items per page
        - Maximum: 100 items per page
        - Use `unpaginated=true` to bypass pagination and fetch all items (useful for reordering)

        **Examples:**
        - `?fields=id,status,notes` - Return only basic item info
        - `?omit=member_ratings` - Exclude member ratings from response
        - `?expand=content_item` - Expand content_item relationship with full details
        - `?expand=content_item&fields=id,status,content_item.source_data` - Expand content item and only return source data
        - `?expand=content_item&source_fields=title,cover.url` - Expand content and filter external API data to only title and cover URL
        - `?expand=content_item,added_by&fields=id,content_item,added_by.username` - Expand multiple relationships with field selection
        - `?source_fields=title,release_date,genres.name` - Filter source_data to specific fields (works with dot notation for nested data)

        **Performance Note:** Using `unpaginated=true` on lists with many items (>200) may impact performance. A warning will be logged for large lists.
        ''',
        parameters=[
            OpenApiParameter('country', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='ISO 3166-1 alpha-2 country code to filter providers by country (only applies when source_api=tmdb)'),
            OpenApiParameter('page', OpenApiTypes.INT, OpenApiParameter.QUERY, required=False, description='Page number (default: 1)'),
            OpenApiParameter('page_size', OpenApiTypes.INT, OpenApiParameter.QUERY, required=False, description='Number of items per page (default: 20, max: 100).'),
            OpenApiParameter('unpaginated', OpenApiTypes.BOOL, OpenApiParameter.QUERY, required=False, description='Set to true to bypass pagination and fetch all items.'),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include (e.g., "id,status")'),
            OpenApiParameter('omit', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to exclude'),
            OpenApiParameter('expand', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of relationships to expand (e.g., "content_item,added_by")'),
            OpenApiParameter('source_fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include from external API source_data. Supports dot notation (e.g., "title,cover.url,genres.name")')
        ],
        responses={
            200: ListItemSerializer(many=True),
            403: OpenApiExample('Forbidden', value={'detail': 'You do not have access to this list.'}),
            404: OpenApiExample('Not Found', value={'detail': 'Lista no encontrada o no tienes acceso a ella.'})
        }
    ),
    retrieve=extend_schema(
        tags=['List Items'],
        summary='Get item details',
        description='''
        Get detailed information about a specific item in a list.
        Detailed information from external APIs (TMDB, IGDB, Spotify, OpenLibrary) is always included in the `source_data` field of the content item.

        **Optional Query Parameters:**
        - `country`: ISO 3166-1 alpha-2 country code (e.g., US, GB, FR) to filter providers by country (only applies when source_api=tmdb).

        **Dynamic Fields (drf-flex-fields):**
        - `fields`: Comma-separated list of fields to include
        - `omit`: Comma-separated list of fields to exclude
        - `expand`: Comma-separated list of relationships to expand
        - `source_fields`: Filter external API source_data to specific fields

        **Examples:**
        - `?fields=id,status,content_item` - Return basic item info with content item
        - `?expand=content_item,added_by` - Expand content item and user who added it
        - `?source_fields=title,cover.url,runtime` - Filter source_data to specific fields only
        - `?expand=content_item&source_fields=title,genres.name,providers.provider_name` - Expand and filter nested external API data
        ''',
        parameters=[
            OpenApiParameter('country', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='ISO 3166-1 alpha-2 country code to filter providers by country (only applies when source_api=tmdb)'),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include'),
            OpenApiParameter('omit', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to exclude'),
            OpenApiParameter('expand', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of relationships to expand'),
            OpenApiParameter('source_fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Filter source_data fields. Supports dot notation (e.g., "title,cover.url")')
        ],
        responses={200: ListItemSerializer}
    ),
    create=extend_schema(
        tags=['List Items'],
        summary='Add item to list',
        description='''
        Add a new content item to the list.

        The content item is identified by:
        - `source_api`: The external API source (tmdb, spotify, igdb, openlibrary)
        - `external_id`: The ID from the external API
        - `content_type`: The type of content (MOVIE, TV_SHOW, SEASON, ALBUM, GAME, BOOK)

        If the content item doesn't exist in the database, it will be created automatically.
        ''',
        request=ListItemCreateSerializer,
        responses={
            201: ListItemSerializer,
            404: OpenApiExample('Not Found', value={'detail': 'Lista no encontrada o no tienes acceso a ella.'})
        },
        examples=[
            OpenApiExample(
                'Add Movie',
                value={
                    'source_api': 'tmdb',
                    'external_id': '550',
                    'content_type': 'MOVIE',
                    'status': 'PENDING',
                    'notes': 'Fight Club - Must watch!'
                },
                request_only=True
            ),
            OpenApiExample(
                'Add Album',
                value={
                    'source_api': 'spotify',
                    'external_id': '7ycBtnsMtyVbbwTfJwRjSP',
                    'content_type': 'ALBUM',
                    'status': 'PENDING'
                },
                request_only=True
            )
        ]
    ),
    update=extend_schema(
        tags=['List Items'],
        summary='Update list item',
        description='Update a list item. Can change status (PENDING/COMPLETED) and notes.',
        request=ListItemSerializer,
        responses={200: ListItemSerializer}
    ),
    partial_update=extend_schema(
        tags=['List Items'],
        summary='Partially update list item',
        description='Update specific fields of a list item.',
        request=ListItemSerializer,
        responses={200: ListItemSerializer},
        examples=[
            OpenApiExample(
                'Mark as Completed',
                value={'status': 'COMPLETED'},
                request_only=True
            ),
            OpenApiExample(
                'Update Notes',
                value={'notes': 'Watched it yesterday, amazing!'},
                request_only=True
            )
        ]
    ),
    destroy=extend_schema(
        tags=['List Items'],
        summary='Remove item from list',
        description='Remove an item from the list.',
        responses={204: None}
    )
)
class ListItemViewSet(FlexFieldsMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsMemberOfList]
    permit_list_expands = ['content_item', 'user_list', 'added_by']

    def get_queryset(self):
        from django.db.models import Q
        list_id = self.kwargs.get('list_pk')

        member_ids_subquery = Subquery(
            UserList.objects.filter(pk=list_id).values('members__id')
        )
        owner_id_subquery = Subquery(
            UserList.objects.filter(pk=list_id).values('owner_id')[:1]
        )

        ratings_qs = Rating.objects.filter(
            Q(user_id__in=member_ids_subquery) | Q(user_id=owner_id_subquery)
        ).select_related('user').order_by('-created_at')

        return ListItem.objects.filter(
            user_list_id=list_id,
        ).select_related(
            'content_item',
            'added_by',
            'user_list',
        ).prefetch_related(
            'user_list__members',
            Prefetch(
                'content_item__ratings',
                queryset=ratings_qs,
                to_attr='member_ratings_prefetched',
            ),
        ).order_by('list_order', '-added_at')

    def get_serializer_class(self):
        if self.action == 'create': return ListItemCreateSerializer
        return ListItemSerializer

    def get_list(self):
        list_id = self.kwargs.get('list_pk')
        try:
            user_list = UserList.objects.get(pk=list_id)

            # Check if user is the owner or a member
            if user_list.owner == self.request.user:
                return user_list

            if not user_list.members.filter(id=self.request.user.id).exists():
                return None

            return user_list
        except UserList.DoesNotExist:
            return None

    def _wants_source_data(self, request):
        if request.query_params.get('include_source_data', '').lower() in ('true', '1'):
            return True
        if request.query_params.get('source_fields'):
            return True
        expand = request.query_params.get('expand', '')
        if 'content_item' in expand or 'source_data' in expand:
            return True
        return False

    def list(self, request, *args, **kwargs):
        user_list = self.get_list()
        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada o no tienes acceso a ella.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        items_to_serialize = page if page is not None else list(queryset)

        context = self.get_serializer_context()

        if self._wants_source_data(request):
            country_code = request.query_params.get('country')
            content_items = [item.content_item for item in items_to_serialize]
            context['source_data_cache'] = bulk_fetch_source_data(
                content_items, country_code=country_code,
            )

        serializer = self.get_serializer(items_to_serialize, many=True, context=context)

        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        user_list = self.get_list()

        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada o no tienes acceso a ella.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        serializer.save(
            user_list=user_list,
            added_by=request.user
        )

        return Response(
            ListItemSerializer(serializer.instance, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        user_list = self.get_list()

        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada o no tienes acceso a ella.'},
                status=status.HTTP_404_NOT_FOUND
            )

        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        user_list = self.get_list()

        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada o no tienes acceso a ella.'},
                status=status.HTTP_404_NOT_FOUND
            )

        instance = self.get_object()
        instance.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        tags=['List Items'],
        summary='Reorder all items in a list',
        description='''
        Set a new order by passing the list of item IDs in the desired order.

        **Important:** This endpoint requires ALL item IDs in the list to be included in the request.
        If your list is paginated, first fetch all items using `GET /api/content/lists/{list_id}/items/?unpaginated=true`
        to get all item IDs before calling this endpoint.

        **Request Body:**
        - Must be either a list of item IDs: `[1, 2, 3, ...]`
        - Or an object with "order" key: `{"order": [1, 2, 3, ...]}`

        **Validation:**
        - All current list item IDs must be included
        - No extra IDs can be included
        - Order determines the new positions (1-based)
        ''',
        request=None,
        responses={200: ListItemSerializer(many=True)}
    )
    def reorder(self, request, *args, **kwargs):
        user_list = self.get_list()
        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada o no tienes acceso a ella.'},
                status=status.HTTP_404_NOT_FOUND
            )

        order = request.data if isinstance(request.data, list) else request.data.get('order')
        if not isinstance(order, list) or not order:
            return Response(
                {'detail': 'Body must be a non-empty list or {"order": [...]}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        items = list(self.get_queryset())
        current_ids = {item.id for item in items}
        new_ids = set(order)

        if current_ids != new_ids:
            return Response(
                {'detail': 'Order must include all and only current list item IDs.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        id_to_pos = {int(item_id): idx + 1 for idx, item_id in enumerate(order)}

        with transaction.atomic():
            # Step 1: Move all items to temporary negative positions to avoid unique constraint conflicts
            for item in items:
                item.list_order = -item.id
            ListItem.objects.bulk_update(items, ['list_order'])

            # Step 2: Update to final positions
            for item in items:
                item.list_order = id_to_pos[item.id]
            ListItem.objects.bulk_update(items, ['list_order'])

        refreshed = self.get_queryset()
        # Skip fetching external API data during reorder for performance
        context = {'request': request, 'skip_source_data': True}
        return Response(ListItemSerializer(refreshed, many=True, context=context).data)

    @extend_schema(
        tags=['List Items'],
        summary='Move a single item to a position',
        description='Move the specified item to a given 1-based position, shifting others accordingly.',
        parameters=[OpenApiParameter('pk', OpenApiTypes.INT, OpenApiParameter.PATH, description='List item ID')],
        request=None,
        responses={200: ListItemSerializer(many=True)}
    )
    def move(self, request, *args, **kwargs):
        user_list = self.get_list()
        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada o no tienes acceso a ella.'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            position = int(request.data.get('position'))
        except Exception:
            return Response(
                {'detail': '"position" must be an integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance = self.get_object()
        if instance.user_list_id != user_list.id:
            return Response(
                {'detail': 'Item does not belong to this list.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        count = self.get_queryset().count()
        if position < 1 or position > count:
            return Response(
                {'detail': f'position must be between 1 and {count}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_pos = instance.list_order
        if old_pos == position:
            refreshed = self.get_queryset()
            return Response(ListItemSerializer(refreshed, many=True, context={'request': request}).data)

        with transaction.atomic():
            # Move target item to temporary position first to avoid conflicts
            instance.list_order = -instance.id
            instance.save(update_fields=['list_order'])

            if position < old_pos:
                # Shift up range [position, old_pos-1] by +1
                (ListItem.objects.filter(
                    user_list_id=user_list.id,
                    list_order__gte=position,
                    list_order__lt=old_pos
                ).update(
                    list_order=F('list_order') + 1
                ))
            else:
                # Shift down range [old_pos+1, position] by -1
                (ListItem.objects.filter(
                    user_list_id=user_list.id,
                    list_order__gt=old_pos,
                    list_order__lte=position
                ).update(
                    list_order=F('list_order') - 1
                ))

            # Move to final position
            instance.list_order = position
            instance.save(update_fields=['list_order'])

        refreshed = self.get_queryset()
        # Skip fetching external API data during move for performance
        context = {'request': request, 'skip_source_data': True}
        return Response(ListItemSerializer(refreshed, many=True, context=context).data)
