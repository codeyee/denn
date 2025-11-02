from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from content.models import UserList
from content.serializers import UserListSerializer, UserListDetailSerializer
from content.permissions import IsOwnerOrReadOnly

@extend_schema_view(
    list=extend_schema(
        tags=['Lists'],
        summary='List all user lists',
        description='Get all lists where the user is the owner or a member.',
        responses={200: UserListSerializer(many=True)}
    ),
    retrieve=extend_schema(
        tags=['Lists'],
        summary='Get list details',
        description='''
        Get detailed information about a specific list including all items and members.

        **Optional Query Parameter:**
        - `render_source`: Set to `true` to include detailed information from external APIs (TMDB, IGDB, Spotify, OpenLibrary) in the `source_data` field of each content item.
        ''',
        parameters=[
            OpenApiParameter('render_source', OpenApiTypes.BOOL, OpenApiParameter.QUERY, required=False, description='Include external API data in response (set to true/false)')
        ],
        responses={
            200: UserListDetailSerializer,
            403: OpenApiExample('Forbidden', value={'detail': 'You do not have permission to view this list.'}),
            404: OpenApiExample('Not Found', value={'detail': 'List not found.'})
        }
    ),
    create=extend_schema(
        tags=['Lists'],
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
        tags=['Lists'],
        summary='Update a list',
        description='Update list details. Only the owner can update the list.',
        request=UserListSerializer,
        responses={
            200: UserListSerializer,
            403: OpenApiExample('Forbidden', value={'detail': 'You do not have permission to edit this list.'})
        }
    ),
    partial_update=extend_schema(
        tags=['Lists'],
        summary='Partially update a list',
        description='Update specific fields of a list. Only the owner can update the list.',
        request=UserListSerializer,
        responses={200: UserListSerializer}
    ),
    destroy=extend_schema(
        tags=['Lists'],
        summary='Delete a list',
        description='Delete a list permanently. Only the owner can delete the list.',
        responses={
            204: None,
            403: OpenApiExample('Forbidden', value={'detail': 'You do not have permission to delete this list.'})
        }
    )
)
class UserListViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return UserList.objects.filter(
            Q(owner=user) | Q(members=user)
        ).distinct().prefetch_related(
            'members',
            'items__content_item',
            'items__added_by',
            'items__content_item__ratings__user'
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserListDetailSerializer
        return UserListSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwnerOrReadOnly()]

        elif self.action == 'retrieve':
            return [IsAuthenticated(), IsOwnerOrReadOnly()]

        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @extend_schema(
        tags=['Lists'],
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
