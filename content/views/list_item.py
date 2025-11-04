from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import F
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from content.models import ListItem, UserList
from content.serializers import ListItemSerializer, ListItemCreateSerializer
from content.permissions import IsMemberOfList

@extend_schema_view(
    list=extend_schema(
        tags=['List Items'],
        summary='List all items in a list',
        description='''
        Get all items in a specific list. Only members of the list can view its items.

        **Optional Query Parameter:**
        - `render_source`: Set to `true` to include detailed information from external APIs (TMDB, IGDB, Spotify, OpenLibrary) in the `source_data` field of each content item.
        ''',
        parameters=[
            OpenApiParameter('render_source', OpenApiTypes.BOOL, OpenApiParameter.QUERY, required=False, description='Include external API data in response (set to true/false)')
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

        **Optional Query Parameter:**
        - `render_source`: Set to `true` to include detailed information from external APIs (TMDB, IGDB, Spotify, OpenLibrary) in the `source_data` field of the content item.
        ''',
        parameters=[
            OpenApiParameter('render_source', OpenApiTypes.BOOL, OpenApiParameter.QUERY, required=False, description='Include external API data in response (set to true/false)')
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
class ListItemViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsMemberOfList]

    def get_queryset(self):
        list_id = self.kwargs.get('list_pk')
        return ListItem.objects.filter(
            user_list_id=list_id
        ).select_related(
            'content_item',
            'added_by',
            'user_list'
        ).prefetch_related(
            'user_list__members',
            'content_item__ratings__user'
        ).order_by('list_order', '-added_at')

    def get_serializer_class(self):
        if self.action == 'create': return ListItemCreateSerializer
        return ListItemSerializer

    def get_list(self):
        list_id = self.kwargs.get('list_pk')
        try:
            user_list = UserList.objects.get(pk=list_id)

            if not user_list.members.filter(id=self.request.user.id).exists():
                return None

            return user_list
        except UserList.DoesNotExist:
            return None

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
        description='Set a new order by passing the list of item IDs in the desired order. Positions are 1-based.',
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

        for item in items:
            item.list_order = id_to_pos[item.id]

        with transaction.atomic():
            ListItem.objects.bulk_update(items, ['list_order'])

        refreshed = self.get_queryset()
        return Response(ListItemSerializer(refreshed, many=True, context={'request': request}).data)

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

            instance.list_order = position
            instance.save(update_fields=['list_order'])

        refreshed = self.get_queryset()
        return Response(ListItemSerializer(refreshed, many=True, context={'request': request}).data)
