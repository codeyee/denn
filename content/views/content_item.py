from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from content.models import ContentItem
from content.serializers import ContentItemSerializer
from content.permissions import IsAdminOrReadOnly

@extend_schema_view(
    list=extend_schema(
        tags=['Content Items'],
        summary='List content items',
        description='''
        Get all content items with optional filtering by source API, content type, or search.

        **Optional Header:**
        - `X-Render-Content`: When present, includes detailed information from external APIs (TMDB, IGDB, Spotify, OpenLibrary) in the `source_data` field of each content item.
        ''',
        parameters=[
            OpenApiParameter('source_api', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by source API (tmdb, igdb, spotify, openlibrary)'),
            OpenApiParameter('content_type', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by content type (MOVIE, TV_SHOW, GAME, ALBUM, BOOK)'),
            OpenApiParameter('external_id', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by external ID'),
            OpenApiParameter('ordering', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Order by field (e.g., "-created_at", "rating_count", "-average_rating")'),
            OpenApiParameter('X-Render-Content', OpenApiTypes.STR, OpenApiParameter.HEADER, required=False, description='Include external API data in response'),
        ],
        responses={200: ContentItemSerializer(many=True)}
    ),
    retrieve=extend_schema(
        tags=['Content Items'],
        summary='Get content item details',
        description='''
        Get detailed information about a specific content item.

        **Optional Header:**
        - `X-Render-Content`: When present, includes detailed information from external APIs (TMDB, IGDB, Spotify, OpenLibrary) in the `source_data` field.
        ''',
        parameters=[
            OpenApiParameter('X-Render-Content', OpenApiTypes.STR, OpenApiParameter.HEADER, required=False, description='Include external API data in response')
        ],
        responses={
            200: ContentItemSerializer,
            404: OpenApiExample('Not Found', value={'detail': 'Content item not found.'})
        }
    ),
    create=extend_schema(
        tags=['Content Items'],
        summary='Create a content item (Admin only)',
        description='Create a new content item. Only administrators can perform this action.',
        request=ContentItemSerializer,
        responses={
            201: ContentItemSerializer,
            400: OpenApiExample('Validation Error', value={'source_api': ['This field is required.']}),
            403: OpenApiExample('Forbidden', value={'detail': 'You do not have permission to perform this action.'})
        },
        examples=[
            OpenApiExample(
                'Movie Item',
                value={
                    'source_api': 'tmdb',
                    'external_id': '550',
                    'content_type': 'MOVIE'
                },
                request_only=True
            ),
            OpenApiExample(
                'Game Item',
                value={
                    'source_api': 'igdb',
                    'external_id': '25076',
                    'content_type': 'GAME'
                },
                request_only=True
            )
        ]
    ),
    update=extend_schema(
        tags=['Content Items'],
        summary='Update a content item (Admin only)',
        description='Update content item details. Only administrators can perform this action.',
        request=ContentItemSerializer,
        responses={
            200: ContentItemSerializer,
            400: OpenApiExample('Validation Error', value={'content_type': ['Invalid content type.']}),
            403: OpenApiExample('Forbidden', value={'detail': 'You do not have permission to perform this action.'})
        }
    ),
    partial_update=extend_schema(
        tags=['Content Items'],
        summary='Partially update a content item (Admin only)',
        description='Update specific fields of a content item. Only administrators can perform this action.',
        request=ContentItemSerializer,
        responses={200: ContentItemSerializer}
    ),
    destroy=extend_schema(
        tags=['Content Items'],
        summary='Delete a content item (Admin only)',
        description='Delete a content item permanently. Only administrators can perform this action. WARNING: This will also delete all associated ratings and list items.',
        responses={
            204: None,
            403: OpenApiExample('Forbidden', value={'detail': 'You do not have permission to perform this action.'})
        }
    )
)
class ContentItemViewSet(viewsets.ModelViewSet):
    queryset = ContentItem.objects.all().order_by('-created_at')
    serializer_class = ContentItemSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['created_at', 'rating_count', 'average_rating']
    ordering = ['-created_at']
    search_fields = ['external_id']

    def get_queryset(self):
        queryset = super().get_queryset()

        source_api = self.request.query_params.get('source_api')
        if source_api: queryset = queryset.filter(source_api=source_api)

        content_type = self.request.query_params.get('content_type')
        if content_type: queryset = queryset.filter(content_type=content_type)

        external_id = self.request.query_params.get('external_id')
        if external_id: queryset = queryset.filter(external_id=external_id)

        return queryset

    @extend_schema(
        tags=['Content Items'],
        summary='Get or create content item',
        description='Get a content item by source API and external ID, or create it if it doesn\'t exist. This is useful for ensuring a content item exists before creating ratings or list items.',
        parameters=[
            OpenApiParameter('source_api', OpenApiTypes.STR, OpenApiParameter.QUERY, required=True, description='Source API (tmdb, igdb, spotify, openlibrary)'),
            OpenApiParameter('external_id', OpenApiTypes.STR, OpenApiParameter.QUERY, required=True, description='External ID from the source API'),
            OpenApiParameter('content_type', OpenApiTypes.STR, OpenApiParameter.QUERY, required=True, description='Content type (MOVIE, TV_SHOW, GAME, ALBUM, BOOK)'),
        ],
        request=None,
        responses={
            200: ContentItemSerializer,
            201: ContentItemSerializer,
            400: OpenApiExample('Validation Error', value={'error': 'Missing required parameters'}),
        }
    )
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def get_or_create(self, request):
        source_api = request.data.get('source_api')
        external_id = request.data.get('external_id')
        content_type = request.data.get('content_type')

        if not all([source_api, external_id, content_type]):
            return Response(
                {'error': 'Missing required parameters: source_api, external_id, content_type'},
                status=status.HTTP_400_BAD_REQUEST
            )

        content_item, created = ContentItem.objects.get_or_create(
            source_api=source_api,
            external_id=external_id,
            defaults={'content_type': content_type}
        )

        serializer = self.get_serializer(content_item)
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=response_status)

    @extend_schema(
        tags=['Content Items'],
        summary='Search content items by external ID',
        description='Find content items by their external ID. This is useful for checking if content from external APIs already exists in the system.',
        parameters=[
            OpenApiParameter('external_id', OpenApiTypes.STR, OpenApiParameter.QUERY, required=True, description='External ID to search for'),
            OpenApiParameter('source_api', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Optional: Filter by source API'),
        ],
        responses={
            200: ContentItemSerializer(many=True),
            400: OpenApiExample('Bad Request', value={'error': 'Missing external_id parameter'}),
        }
    )
    @action(detail=False, methods=['get'])
    def by_external_id(self, request):
        external_id = request.query_params.get('external_id')
        source_api = request.query_params.get('source_api')

        if not external_id:
            return Response(
                {'error': 'Missing external_id parameter'},
                status=status.HTTP_400_BAD_REQUEST
            )

        queryset = self.queryset.filter(external_id=external_id)

        if source_api:
            queryset = queryset.filter(source_api=source_api)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

