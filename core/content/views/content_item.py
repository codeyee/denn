from rest_framework import viewsets, status, filters, serializers as drf_serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import get_object_or_404
from django.db.models import Prefetch, Q
from django.shortcuts import redirect
from django.urls import reverse
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from content.models import ContentItem, Rating
from content.serializers import ContentItemSerializer
from content.permissions import IsAdminOrReadOnly
from rest_flex_fields.views import FlexFieldsMixin


class ContentItemLookupSerializer(drf_serializers.Serializer):
    source_api = drf_serializers.ChoiceField(choices=ContentItem.SourceAPI.choices)
    external_id = drf_serializers.CharField(max_length=255)
    content_type = drf_serializers.ChoiceField(choices=ContentItem.ContentType.choices)


class ContentItemBulkResolveInputSerializer(ContentItemLookupSerializer):
    pass


class ContentItemBulkResolveRequestSerializer(drf_serializers.Serializer):
    items = ContentItemBulkResolveInputSerializer(many=True)

    def validate_items(self, items):
        if not items:
            raise drf_serializers.ValidationError('At least one item is required.')
        if len(items) > 100:
            raise drf_serializers.ValidationError('Maximum 100 items allowed per request.')

        seen = set()
        expected_sources = {
            ContentItem.ContentType.MOVIE: ContentItem.SourceAPI.TMDB,
            ContentItem.ContentType.TV_SHOW: ContentItem.SourceAPI.TMDB,
            ContentItem.ContentType.SEASON: ContentItem.SourceAPI.TMDB,
            ContentItem.ContentType.GAME: ContentItem.SourceAPI.IGDB,
            ContentItem.ContentType.ALBUM: ContentItem.SourceAPI.SPOTIFY,
            ContentItem.ContentType.BOOK: ContentItem.SourceAPI.OPENLIBRARY,
        }
        for item in items:
            key = (
                item['source_api'],
                item['external_id'],
                item['content_type'],
            )
            if key in seen:
                raise drf_serializers.ValidationError(
                    'Duplicate source_api/external_id/content_type triples are not allowed.'
                )
            seen.add(key)
            if expected_sources[item['content_type']] != item['source_api']:
                raise drf_serializers.ValidationError(
                    'source_api is not valid for content_type.'
                )
        return items


@extend_schema_view(
    list=extend_schema(
        tags=['Content Items'],
        summary='List content items',
        description='''
        Get all content items with optional filtering by source API, content type, or search.
        Detailed information from external APIs (TMDB, IGDB, Spotify, OpenLibrary) is always included in the `source_data` field.

        **Optional Query Parameters:**
        - `country`: ISO 3166-1 alpha-2 country code (e.g., US, GB, FR) to filter providers by country (only applies when source_api=tmdb).

        **Dynamic Fields (drf-flex-fields):**
        - `fields`: Comma-separated list of fields to include
        - `omit`: Comma-separated list of fields to exclude
        - `source_fields`: Filter source_data to specific fields (supports dot notation)

        **Examples:**
        - `?fields=id,source_api,external_id` - Return only basic fields
        - `?omit=source_data` - Exclude external API data
        - `?source_fields=title,cover.url` - Filter source_data to specific fields
        - `?source_api=tmdb&content_type=MOVIE&fields=id,source_data&source_fields=title,release_date` - Filter and select fields
        ''',
        parameters=[
            OpenApiParameter('source_api', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by source API (tmdb, igdb, spotify, openlibrary)'),
            OpenApiParameter('content_type', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by content type (MOVIE, TV_SHOW, SEASON, GAME, ALBUM, BOOK)'),
            OpenApiParameter('external_id', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by external ID'),
            OpenApiParameter('ordering', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Order by field (e.g., "-created_at", "rating_count", "-average_rating")'),
            OpenApiParameter('country', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='ISO 3166-1 alpha-2 country code to filter providers by country (only applies when source_api=tmdb)'),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include'),
            OpenApiParameter('omit', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to exclude'),
            OpenApiParameter('source_fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Filter source_data fields. Supports dot notation (e.g., "title,cover.url")'),
        ],
        responses={200: ContentItemSerializer(many=True)}
    ),
    retrieve=extend_schema(
        tags=['Content Items'],
        summary='Get content item details',
        description='''
        Get detailed information about a specific content item.
        Detailed information from external APIs (TMDB, IGDB, Spotify, OpenLibrary) is always included in the `source_data` field.

        **Optional Query Parameters:**
        - `country`: ISO 3166-1 alpha-2 country code (e.g., US, GB, FR) to filter providers by country (only applies when source_api=tmdb).

        **Dynamic Fields (drf-flex-fields):**
        - `fields`: Comma-separated list of fields to include
        - `omit`: Comma-separated list of fields to exclude
        - `source_fields`: Filter source_data to specific fields

        **Examples:**
        - `?fields=id,source_api,source_data` - Return only specific fields
        - `?source_fields=title,cover.url,runtime` - Filter external API data
        ''',
        parameters=[
            OpenApiParameter('country', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='ISO 3166-1 alpha-2 country code to filter providers by country (only applies when source_api=tmdb)'),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include'),
            OpenApiParameter('omit', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to exclude'),
            OpenApiParameter('source_fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Filter source_data fields. Supports dot notation'),
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
class ContentItemViewSet(FlexFieldsMixin, viewsets.ModelViewSet):
    queryset = ContentItem.objects.all().order_by('-created_at')
    serializer_class = ContentItemSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['created_at', 'rating_count', 'average_rating']
    ordering = ['-created_at']
    search_fields = ['external_id']
    permit_list_expands = []

    def get_queryset(self):
        queryset = super().get_queryset()

        source_api = self.request.query_params.get('source_api')
        if source_api: queryset = queryset.filter(source_api=source_api)

        content_type = self.request.query_params.get('content_type')
        if content_type: queryset = queryset.filter(content_type=content_type)

        external_id = self.request.query_params.get('external_id')
        if external_id: queryset = queryset.filter(external_id=external_id)

        return queryset

    def _wants_source_data(self, request):
        """Mirror of ContentItemSerializer._should_include_source_data."""
        if request.query_params.get('source_fields'):
            return True
        expand = request.query_params.get('expand', '')
        if 'content_item' in expand or 'source_data' in expand:
            return True
        include = request.query_params.get('include_source_data', '').lower()
        return include in ('true', '1')

    def list(self, request, *args, **kwargs):
        """Override to precompute source_data_cache once per page.

        Sprint 08 / T3: without this, each item in the page would call
        `fetch_source_data` individually inside the serializer, which is
        N HTTP calls to the proxy per request. The cache fans out via
        `fetch_bulk_source_data` (one call per source family).
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        items_to_serialize = page if page is not None else list(queryset)

        context = self.get_serializer_context()
        if self._wants_source_data(request) and items_to_serialize:
            from content.services.source_data_orchestrator import fetch_bulk_source_data
            country_code = request.query_params.get('country')
            context['source_data_cache'] = fetch_bulk_source_data(
                list(items_to_serialize), country_code=country_code,
            )

        serializer = self.get_serializer(items_to_serialize, many=True, context=context)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @extend_schema(
        tags=['Content Items'],
        summary='Get or create content item (deprecated alias)',
        description='''
        DEPRECATED — use `POST /api/content/get-or-create/` instead.

        Get a content item by source API and external ID, or create it if it doesn't exist.
        ''',
        deprecated=True,
        request=ContentItemLookupSerializer,
        responses={
            200: ContentItemSerializer,
            201: ContentItemSerializer,
            400: OpenApiExample('Validation Error', value={'error': 'VALIDATION_ERROR'}),
        }
    )
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def get_or_create(self, request):
        lookup = ContentItemLookupSerializer(data=request.data)
        lookup.is_valid(raise_exception=True)

        from content.services.local_content_store import get_or_create_content_item

        content_item, created = get_or_create_content_item(
            source_api=lookup.validated_data['source_api'],
            external_id=lookup.validated_data['external_id'],
            content_type=lookup.validated_data['content_type'],
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
            OpenApiParameter('content_type', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Optional: Filter by content type (MOVIE, TV_SHOW, SEASON, GAME, ALBUM, BOOK)'),
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
        content_type = request.query_params.get('content_type')

        if not external_id:
            return Response(
                {'error': 'Missing external_id parameter'},
                status=status.HTTP_400_BAD_REQUEST
            )

        queryset = self.queryset.filter(external_id=external_id)

        if source_api:
            queryset = queryset.filter(source_api=source_api)

        if content_type:
            queryset = queryset.filter(content_type=content_type)

        items = list(queryset)
        context = self.get_serializer_context()
        if self._wants_source_data(request) and items:
            from content.services.source_data_orchestrator import fetch_bulk_source_data
            country_code = request.query_params.get('country')
            context['source_data_cache'] = fetch_bulk_source_data(
                items, country_code=country_code,
            )

        serializer = self.get_serializer(items, many=True, context=context)
        return Response(serializer.data)


@extend_schema(
    tags=['Content Items'],
    summary='Get content item details by public id',
    description='''
    Public, id-first endpoint for resolving a single content item along with
    its `source_data` payload (always included). This is the canonical URL
    for content detail pages — frontends should link here directly using the
    internal numeric id.

    Optional `country` query param scopes streaming providers (TMDB only).
    ''',
    parameters=[
        OpenApiParameter('country', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False,
                         description='ISO 3166-1 alpha-2 country code'),
    ],
    responses={
        200: ContentItemSerializer,
        404: OpenApiExample('Not Found', value={'detail': 'Content item not found.'})
    }
)
class ContentItemDetailByIdView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        item = get_object_or_404(
            ContentItem.objects.prefetch_related(
                Prefetch(
                    'ratings',
                    queryset=Rating.objects.filter(user=request.user),
                    to_attr='current_user_ratings',
                ),
            ),
            pk=id,
        )
        from content.services.source_data_orchestrator import fetch_bulk_source_data

        source_data_cache = fetch_bulk_source_data(
            [item],
            country_code=request.query_params.get('country'),
            stale_while_revalidate=True,
        )
        serializer = ContentItemSerializer(
            item,
            context={
                'request': request,
                'include_source_data': True,
                'source_data_cache': source_data_cache,
            },
        )
        return Response(serializer.data)


@extend_schema(
    tags=['Content Items'],
    summary='Resolve external content identities in bulk',
    description='''
    Idempotently resolves up to 100 external content triples to canonical
    Denn ids. This endpoint owns identity only; it never trusts
    browser-supplied provider metadata. Missing detail is materialized later
    through the canonical `core` -> `proxy` path.
    ''',
    request=ContentItemBulkResolveRequestSerializer,
    responses={200: OpenApiTypes.OBJECT},
)
class ContentItemBulkResolveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import logging
        import time

        serializer = ContentItemBulkResolveRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        input_items = serializer.validated_data['items']
        started = time.monotonic()

        candidates = [
            ContentItem(
                source_api=item['source_api'],
                external_id=item['external_id'],
                content_type=item['content_type'],
            )
            for item in input_items
        ]
        ContentItem.objects.bulk_create(candidates, ignore_conflicts=True)

        query = Q()
        for item in input_items:
            query |= Q(
                source_api=item['source_api'],
                external_id=item['external_id'],
                content_type=item['content_type'],
            )
        resolved = ContentItem.objects.filter(query)
        resolved_by_key = {
            (item.source_api, item.external_id, item.content_type): item
            for item in resolved
        }

        results = []
        for input_item in input_items:
            key = (
                input_item['source_api'],
                input_item['external_id'],
                input_item['content_type'],
            )
            item = resolved_by_key[key]
            results.append({
                'id': item.id,
                'source_api': item.source_api,
                'external_id': item.external_id,
                'content_type': item.content_type,
            })

        logging.getLogger(__name__).info(
            'content_id_bulk_resolution',
            extra={
                'event': 'content_id_bulk_resolution',
                'requested_count': len(input_items),
                'resolved_count': len(results),
                'duration_ms': int((time.monotonic() - started) * 1000),
            },
        )
        return Response({'results': results})


@extend_schema(
    tags=['Content Items'],
    summary='Get or create content item (top-level alias)',
    description='''
    Resolve `(source_api, external_id, content_type)` to a single
    `ContentItem`, creating it if missing. This is the top-level alias for
    the legacy `POST /api/content/items/get_or_create/` endpoint and is the
    preferred call site for new code.
    ''',
    request=ContentItemLookupSerializer,
    responses={200: ContentItemSerializer, 201: ContentItemSerializer},
)
class ContentItemGetOrCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        lookup = ContentItemLookupSerializer(data=request.data)
        lookup.is_valid(raise_exception=True)

        from content.services.local_content_store import get_or_create_content_item

        item, created = get_or_create_content_item(
            source_api=lookup.validated_data['source_api'],
            external_id=lookup.validated_data['external_id'],
            content_type=lookup.validated_data['content_type'],
        )
        serializer = ContentItemSerializer(item, context={'request': request})
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=response_status)


@extend_schema(
    tags=['Content Items'],
    summary='Legacy redirect: external triple → public id',
    description='''
    Issues a `301` permanent redirect from the legacy
    `/api/content/?external_id=&source_api=&content_type=` query-string
    contract to the canonical `/api/content/<id>/` URL. The triple is
    resolved via `get_or_create` so the target is always materialized.

    Returns `400` if any of the three params are missing.
    ''',
    parameters=[
        OpenApiParameter('external_id', OpenApiTypes.STR, OpenApiParameter.QUERY, required=True),
        OpenApiParameter('source_api', OpenApiTypes.STR, OpenApiParameter.QUERY, required=True),
        OpenApiParameter('content_type', OpenApiTypes.STR, OpenApiParameter.QUERY, required=True),
    ],
    responses={301: None, 400: None},
)
class LegacyContentRedirectView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        external_id = request.query_params.get('external_id')
        source_api = request.query_params.get('source_api')
        content_type = request.query_params.get('content_type')

        if not (external_id and source_api and content_type):
            return Response(
                {'error': 'Missing required params: external_id, source_api, content_type'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from content.services.local_content_store import get_or_create_content_item

        try:
            item, _ = get_or_create_content_item(
                source_api=source_api,
                external_id=external_id,
                content_type=content_type,
            )
        except Exception:
            return Response({'error': 'Could not resolve content item'}, status=status.HTTP_404_NOT_FOUND)

        target = reverse('content:content-detail-by-id', kwargs={'id': item.pk})
        return redirect(target, permanent=True)
