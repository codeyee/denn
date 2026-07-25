from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Count, Q
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from content.models import Rating, ContentItem
from content.serializers import RatingSerializer, RatingCreateSerializer
from content.permissions import IsOwnerOfRating
from rest_flex_fields.views import FlexFieldsMixin

@extend_schema_view(
    list=extend_schema(
        tags=['Ratings'],
        summary='List ratings',
        description='''
        List all ratings with optional filtering.

        **Query Parameters:**
        - `content_item_id`: Filter by content item ID
        - `user_id`: Filter by user ID
        - `source_api` + `external_id`: Filter by external content
        - `stats_only=true`: Return only statistics instead of ratings list

        **Dynamic Fields (drf-flex-fields):**
        - `fields`: Comma-separated list of fields to include
        - `omit`: Comma-separated list of fields to exclude
        - `expand`: Expand relationships (content_item, user)

        **Examples:**
        - `?fields=id,score,comment` - Return only basic rating info
        - `?expand=content_item,user` - Expand content item and user details
        - `?expand=content_item&fields=id,score,content_item.source_data` - Expand and filter fields
        ''',
        parameters=[
            OpenApiParameter('content_item_id', OpenApiTypes.INT, description='Filter by content item'),
            OpenApiParameter('user_id', OpenApiTypes.INT, description='Filter by user'),
            OpenApiParameter('source_api', OpenApiTypes.STR, description='External API source', enum=['tmdb', 'spotify', 'igdb', 'openlibrary']),
            OpenApiParameter('external_id', OpenApiTypes.STR, description='External ID'),
            OpenApiParameter('stats_only', OpenApiTypes.BOOL, description='Return only statistics'),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include'),
            OpenApiParameter('omit', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to exclude'),
            OpenApiParameter('expand', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Expand relationships (e.g., "content_item,user")'),
        ],
        responses={
            200: RatingSerializer(many=True),
        }
    ),
    retrieve=extend_schema(
        tags=['Ratings'],
        summary='Get rating details',
        description='Get details of a specific rating.',
        responses={200: RatingSerializer}
    ),
    create=extend_schema(
        tags=['Ratings'],
        summary='Create a rating',
        description='''
        Create a new rating for a content item.

        Score must be between 0.5 and 10.0 (in 0.5 increments).
        A user can only have one rating per content item.
        ''',
        request=RatingCreateSerializer,
        responses={
            201: RatingSerializer,
            400: OpenApiExample('Bad Request', value={'score': ['Score must be between 0.5 and 10.0']})
        },
        examples=[
            OpenApiExample(
                'Rate Movie',
                value={
                    'source_api': 'tmdb',
                    'external_id': '550',
                    'content_type': 'MOVIE',
                    'score': 9.5,
                    'comment': 'An absolute masterpiece!'
                },
                request_only=True
            ),
            OpenApiExample(
                'Rate Album',
                value={
                    'source_api': 'spotify',
                    'external_id': '7ycBtnsMtyVbbwTfJwRjSP',
                    'content_type': 'ALBUM',
                    'score': 8.0,
                    'comment': 'Great album, very nostalgic'
                },
                request_only=True
            )
        ]
    ),
    update=extend_schema(
        tags=['Ratings'],
        summary='Update rating',
        description='Update an existing rating. Only the rating owner can update it.',
        request=RatingCreateSerializer,
        responses={200: RatingSerializer}
    ),
    partial_update=extend_schema(
        tags=['Ratings'],
        summary='Partially update rating',
        description='Update specific fields of a rating.',
        request=RatingCreateSerializer,
        responses={200: RatingSerializer},
        examples=[
            OpenApiExample(
                'Update Score',
                value={'score': 10.0, 'comment': 'Changed my mind, its perfect!'},
                request_only=True
            )
        ]
    ),
    destroy=extend_schema(
        tags=['Ratings'],
        summary='Delete rating',
        description='Delete a rating. Only the rating owner can delete it.',
        responses={204: None}
    )
)
class RatingViewSet(FlexFieldsMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    permit_list_expands = ['content_item', 'user']

    def get_queryset(self):
        queryset = Rating.objects.select_related('user', 'content_item').order_by('-created_at')
        if self.action == 'list':
            queryset = queryset.filter(is_active=True)
        elif self.action == 'retrieve':
            queryset = queryset.filter(
                Q(is_active=True) | Q(user=self.request.user)
            )

        content_item_id = self.request.query_params.get('content_item_id')
        if content_item_id:
            queryset = queryset.filter(content_item_id=content_item_id)

        user_id = self.request.query_params.get('user_id')
        if user_id: queryset = queryset.filter(user_id=user_id)

        source_api = self.request.query_params.get('source_api')
        external_id = self.request.query_params.get('external_id')

        if source_api and external_id:
            try:
                content_item = ContentItem.objects.get(
                    source_api=source_api,
                    external_id=external_id
                )
                queryset = queryset.filter(content_item=content_item)
            except ContentItem.DoesNotExist:
                queryset = queryset.none()

        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return RatingCreateSerializer

        return RatingSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwnerOfRating()]

        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        rating = serializer.save(user=request.user)

        return Response(
            RatingSerializer(rating).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        data = {
            'score': request.data.get('score', instance.score),
            'comment': request.data.get('comment', instance.comment),
            'spoiler': request.data.get('spoiler', instance.spoiler),
            'source_api': instance.content_item.source_api,
            'external_id': instance.content_item.external_id,
            'content_type': instance.content_item.content_type,
        }

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        rating = serializer.save(user=request.user)

        return Response(RatingSerializer(rating).data)

    def list(self, request, *args, **kwargs):

        queryset = self.get_queryset()

        if request.query_params.get('stats_only') == 'true':
            content_item_id = request.query_params.get('content_item_id')
            source_api = request.query_params.get('source_api')
            external_id = request.query_params.get('external_id')

            if not content_item_id and not (source_api and external_id):
                return Response(
                    {'detail': 'Debes proporcionar content_item_id o (source_api y external_id).'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            stats = queryset.aggregate(
                average_score=Avg('score'),
                total_ratings=Count('id')
            )

            return Response(stats)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
