from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import F, Prefetch, Subquery
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from content.models import ListItem, UserList, Rating, UserContentTracking
from content.serializers import ListItemSerializer, ListItemCreateSerializer
from content.permissions import IsMemberOfList
from content.services.source_data_orchestrator import fetch_bulk_source_data
from content.services import (
    annotate_items_with_ratings,
    apply_query,
    build_group_metadata,
    parse_list_item_query,
    QueryParseError,
)
from content.services.tracking_service import (
    annotate_list_items_with_personal_tracking,
)

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
        - `?fields=id,context_status` - Return only basic item info
        - `?omit=member_ratings` - Exclude member ratings from response
        - `?expand=content_item` - Expand content_item relationship with full details
        - `?expand=content_item&fields=id,context_status,content_item.source_data` - Expand content item and only return source data
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
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include (e.g., "id,context_status")'),
            OpenApiParameter('omit', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to exclude'),
            OpenApiParameter('expand', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of relationships to expand (e.g., "content_item,added_by")'),
            OpenApiParameter('source_fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include from external API source_data. Supports dot notation (e.g., "title,cover.url,genres.name")'),
            OpenApiParameter('sort', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated sort fields with optional `-` for desc (e.g., "artist,-release_date,list_order"). Whitelisted fields only.'),
            OpenApiParameter('group_by', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Single field to group the page by (e.g., "context_status", "tracking_status", "content_type", "artist"). Pagination remains global.'),
            OpenApiParameter('filter[context_status]', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Filter by shared-list context status. CSV supported (e.g., "PENDING,COMPLETED").'),
            OpenApiParameter('filter[tracking_status]', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Filter by the authenticated user progress status. CSV supported (e.g., "backlog,completed").'),
            OpenApiParameter('filter[content_type]', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Filter by content type. CSV supported.'),
            OpenApiParameter('filter[source_api]', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Filter by source API. CSV supported.'),
            OpenApiParameter('filter[added_by]', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Filter by user id who added the item. CSV supported.'),
        ],
        responses={
            200: ListItemSerializer(many=True),
            400: OpenApiExample('Bad Query', value={'detail': "Unknown sort field: 'foo'"}),
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
        - `?fields=id,context_status,content_item` - Return basic item info with content item
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
                    'context_status': 'PENDING'
                },
                request_only=True
            ),
            OpenApiExample(
                'Add Album',
                value={
                    'source_api': 'spotify',
                    'external_id': '7ycBtnsMtyVbbwTfJwRjSP',
                    'content_type': 'ALBUM',
                    'context_status': 'PENDING'
                },
                request_only=True
            )
        ]
    ),
    update=extend_schema(
        tags=['List Items'],
        summary='Update list item',
        description=(
            'Update a list item. Shared lists may change context_status '
            '(PENDING/COMPLETED); personal progress uses the tracking API.'
        ),
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
                value={'context_status': 'COMPLETED'},
                request_only=True
            ),
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

    def _get_member_ids_for_list(self, list_id):
        """
        Return all member ids (including owner) for the given list.
        Used for annotating list_rating consistently with serializer logic.
        """
        member_ids = list(
            UserList.objects.filter(pk=list_id).values_list('members__id', flat=True)
        )
        member_ids = [mid for mid in member_ids if mid is not None]
        owner_id = UserList.objects.filter(pk=list_id).values_list('owner_id', flat=True).first()
        if owner_id and owner_id not in member_ids:
            member_ids.append(owner_id)
        return member_ids

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
            Q(user_id__in=member_ids_subquery) | Q(user_id=owner_id_subquery),
            is_active=True,
        ).select_related('user').order_by('-created_at')

        member_ids = self._get_member_ids_for_list(list_id)

        qs = ListItem.objects.filter(
            user_list_id=list_id,
        ).select_related(
            'content_item',
            'content_item__browse_meta',
            'content_item__season_detail__tv_show',
            'added_by',
            'user_list',
        ).prefetch_related(
            'user_list__members',
            Prefetch(
                'content_item__ratings',
                queryset=ratings_qs,
                to_attr='member_ratings_prefetched',
            ),
            Prefetch(
                "content_item__ratings",
                queryset=Rating.objects.filter(
                    user=self.request.user,
                    is_active=True,
                ).select_related("content_item"),
                to_attr="current_user_ratings",
            ),
            Prefetch(
                "content_item__user_tracking",
                queryset=UserContentTracking.objects.filter(
                    user=self.request.user,
                ),
                to_attr="current_user_tracking_rows",
            ),
        )

        qs = annotate_list_items_with_personal_tracking(qs, self.request.user)
        qs = annotate_items_with_ratings(qs, member_ids)

        return qs.order_by('list_order', '-added_at')

    def get_serializer_class(self):
        if self.action == 'create': return ListItemCreateSerializer
        return ListItemSerializer

    def get_list(self):
        authorized_list = getattr(self, '_authorized_user_list', None)
        if authorized_list is not None:
            return authorized_list

        list_id = self.kwargs.get('list_pk')
        try:
            user_list = UserList.objects.select_related('owner').get(pk=list_id)

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

    @staticmethod
    def _read_only_dynamic_list(user_list):
        if user_list.list_type != UserList.ListType.DYNAMIC:
            return None
        return Response(
            {"detail": "System-managed list items cannot be added, edited, or removed."},
            status=status.HTTP_403_FORBIDDEN,
        )

    def list(self, request, *args, **kwargs):
        user_list = self.get_list()
        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada o no tienes acceso a ella.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            query = parse_list_item_query(request.query_params)
        except QueryParseError as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.filter_queryset(self.get_queryset())
        queryset = apply_query(queryset, query)
        page = self.paginate_queryset(queryset)
        items_to_serialize = page if page is not None else list(queryset)

        context = self.get_serializer_context()

        if self._wants_source_data(request):
            country_code = request.query_params.get('country')
            content_items = [item.content_item for item in items_to_serialize]
            context['source_data_cache'] = fetch_bulk_source_data(
                content_items, country_code=country_code,
            )

        serializer = self.get_serializer(items_to_serialize, many=True, context=context)

        if page is not None:
            response = self.get_paginated_response(serializer.data)
            if query.has_grouping:
                response.data['metadata']['groups'] = build_group_metadata(
                    items_to_serialize, queryset, query.group_by,
                )
            return response

        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        user_list = self.get_list()

        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada o no tienes acceso a ella.'},
                status=status.HTTP_404_NOT_FOUND
            )

        read_only_response = self._read_only_dynamic_list(user_list)
        if read_only_response:
            return read_only_response

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

        read_only_response = self._read_only_dynamic_list(user_list)
        if read_only_response:
            return read_only_response

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

        read_only_response = self._read_only_dynamic_list(user_list)
        if read_only_response:
            return read_only_response

        instance = self.get_object()
        instance.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        tags=['List Items'],
        summary='Promote an explore sort to the canonical list order',
        description='''
        Promote the current explore sort to the canonical `list_order` of the list.

        Body must contain `sort` as a non-empty CSV string of whitelisted sort
        fields (prefix `-` for desc), identical to the `?sort=` query param.

        Validations:
        - filters and grouping are NOT allowed (operate over the full list only).
        - sort cannot be empty.
        - sort cannot reduce to canonical `list_order` (no-op).
        ''',
        request=None,
        responses={200: OpenApiExample('OK', value={'updated': 42})}
    )
    def apply_sort(self, request, *args, **kwargs):
        user_list = self.get_list()
        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada o no tienes acceso a ella.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if any(k.startswith('filter[') for k in request.query_params.keys()):
            return Response(
                {'detail': 'Filters are not allowed when promoting a sort to the canonical order.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if request.query_params.get('group_by'):
            return Response(
                {'detail': 'Grouping is not allowed when promoting a sort to the canonical order.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sort_raw = request.data.get('sort') if isinstance(request.data, dict) else None
        if not sort_raw or not isinstance(sort_raw, str):
            return Response(
                {'detail': 'Body must include a non-empty "sort" string.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from django.http import QueryDict
            qd = QueryDict(mutable=True)
            qd['sort'] = sort_raw
            query = parse_list_item_query(qd)
        except QueryParseError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if not query.sort:
            return Response(
                {'detail': '"sort" must include at least one valid field.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if all(c.field == 'list_order' for c in query.sort):
            return Response(
                {'detail': 'Sort already matches the canonical list order; nothing to apply.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = apply_query(self.get_queryset(), query)
        items = list(queryset)
        if not items:
            return Response({'updated': 0})

        with transaction.atomic():
            for item in items:
                item.list_order = -item.id
            ListItem.objects.bulk_update(items, ['list_order'])

            for idx, item in enumerate(items, start=1):
                item.list_order = idx
            ListItem.objects.bulk_update(items, ['list_order'])

        return Response({'updated': len(items)})

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
