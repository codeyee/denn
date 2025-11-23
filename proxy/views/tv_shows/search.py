from proxy.views.base import TMDBBaseView
from core.exceptions import MissingParameterException, InvalidParameterException
from proxy.serializers.tv_shows import TVShowSearchResponseSerializer
from proxy.serializers.common import ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from proxy.constants import ContentType
from core.pagination import build_pagination_metadata
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.response import Response
from rest_framework import status as http_status


class TVShowSearchView(TMDBBaseView):
    def _validate_query(self, request):
        query = request.query_params.get('query')
        if not query:
            raise MissingParameterException('query is required')

        return query

    def _validate_page_size(self, request):
        page_size = int(request.query_params.get('page_size', 20))
        if page_size < 1 or page_size > 50:
            raise InvalidParameterException('page_size must be between 1 and 50')

        return page_size

    def _validate_page(self, request):
        page = int(request.query_params.get('page', 1))
        if page < 1:
            raise InvalidParameterException('page must be greater than or equal to 1')

        return page

    def filter_and_transform_results(self, data, mapper, request, page_size):
        if 'results' not in data:
            return data

        results = []
        for item in data['results']:
            mapped_item = mapper.map_search_item(item, ContentType.TV_SHOW)
            results.append(mapped_item.to_dict())

        metadata = build_pagination_metadata(
            request=request,
            current_page=data.get('page', 1),
            page_size=page_size,
            total_results=data.get('total_results'),
            results_count=len(results)
        )

        return {'metadata': metadata, 'results': results}

    @extend_schema(
        tags=['Proxy - TV Shows'],
        summary='Search TV shows',
        description='''
        Search for TV shows by title using TMDB.

        **Dynamic Field Selection:**
        Use the `fields` parameter to select specific fields and reduce response payload size.
        Supports dot notation for nested fields.

        **Examples:**
        - `?fields=id,title,first_air_date` - Return only basic info
        - `?fields=id,title,cover.url` - Include nested cover URL
        - `?fields=id,title,genres.name` - Get all genre names from genres array
        ''',
        parameters=[
            OpenApiParameter(
                'query', OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=True,
                description='Search query'
            ),
            OpenApiParameter(
                'page', OpenApiTypes.INT,
                OpenApiParameter.QUERY,
                required=False,
                description='Page number (default: 1)'
            ),
            OpenApiParameter(
                'page_size', OpenApiTypes.INT,
                OpenApiParameter.QUERY,
                required=False,
                description='Number of results per page (1-50, default: 20)'
            ),
            OpenApiParameter(
                'fields', OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=False,
                description='Comma-separated list of fields to include. Supports dot notation for nested fields (e.g., "id,title,cover.url")'
            )
        ],
        responses={
            200: TVShowSearchResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        query = self._validate_query(request)
        page = self._validate_page(request)
        page_size = self._validate_page_size(request)

        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.search_tv_shows(query, page)
        if status_code != http_status.HTTP_200_OK:
            return Response(data, status=status_code)

        transformed_data = self.filter_and_transform_results(data, mapper, request, page_size)

        # Apply dynamic fields to the results list
        if 'results' in transformed_data:
            transformed_data['results'] = self.apply_dynamic_fields(transformed_data['results'], request)

        return Response(transformed_data, status=http_status.HTTP_200_OK)
