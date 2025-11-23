from rest_framework.response import Response
from rest_framework import status as http_status
from proxy.views.base import IGDBBaseView
from core.exceptions import MissingParameterException, InvalidParameterException
from proxy.serializers.games import GameSearchResponseSerializer
from proxy.serializers.common import ErrorResponseSerializer
from core.pagination import build_pagination_metadata
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class GameSearchView(IGDBBaseView):

    def _validate_query(self, request):
        query = request.query_params.get('query')
        if not query:
            raise MissingParameterException('query is required')

        return query

    def _validate_page_size(self, request):
        page_size = int(request.query_params.get('page_size', 20))
        if page_size < 1 or page_size > 500:
            raise InvalidParameterException('page_size must be between 1 and 500')

        return page_size

    def _validate_page(self, request):
        page = int(request.query_params.get('page', 1))
        if page < 1:
            raise InvalidParameterException('page must be greater than or equal to 1')

        return page

    @extend_schema(
        tags=['Proxy - Games'],
        summary='Search video games',
        description='''
        Search for video games by title using IGDB.

        Note: IGDB doesn't provide total result counts, so count and total_pages may be null.

        **Dynamic Field Selection:**
        Use the `fields` parameter to select specific fields and reduce response payload size.
        Supports dot notation for nested fields.

        **Examples:**
        - `?fields=id,name,release_date` - Return only basic info
        - `?fields=id,name,cover.url` - Include nested cover URL
        - `?fields=id,name,genres.name` - Get all genre names from genres array
        ''',
        parameters=[
            OpenApiParameter('query', OpenApiTypes.STR, required=True, description='Search query'),
            OpenApiParameter('page_size', OpenApiTypes.INT, description='Results per page (1-500, default: 20)'),
            OpenApiParameter('page', OpenApiTypes.INT, description='Page number (default: 1)'),
            OpenApiParameter('fields', OpenApiTypes.STR, required=False, description='Comma-separated list of fields to include. Supports dot notation for nested fields (e.g., "id,name,cover.url")')
        ],
        responses={
            200: GameSearchResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        query = self._validate_query(request)
        page = self._validate_page(request)
        page_size = self._validate_page_size(request)

        offset = (page - 1) * page_size

        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.search_games(query=query, limit=page_size, offset=offset)

        if status_code != http_status.HTTP_200_OK:
            return Response(data, status=status_code)

        if not isinstance(data, list):
            return Response(data, status=status_code)

        results = [mapper.map_search_item(item).to_dict() for item in data]

        # Apply dynamic fields to the results list
        results = self.apply_dynamic_fields(results, request)

        # IGDB doesn't provide totals, so we pass None for total_results
        metadata = build_pagination_metadata(
            request=request,
            current_page=page,
            page_size=page_size,
            total_results=None,  # IGDB doesn't provide this
            results_count=len(results)
        )

        return Response({'metadata': metadata, 'results': results}, status=http_status.HTTP_200_OK)