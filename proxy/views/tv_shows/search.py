from proxy.views.base import TMDBBaseView
from proxy.exceptions import MissingParameterException, InvalidParameterException
from proxy.serializers.tv_shows import TVShowSearchResponseSerializer
from proxy.serializers.common import ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from proxy.constants import ContentType
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

    def _validate_limit(self, request):
        limit = int(request.query_params.get('limit', 50))
        if limit < 1 or limit > 50:
            raise InvalidParameterException('limit must be between 1 and 50')

        return limit

    def _validate_page(self, request):
        page = int(request.query_params.get('page', 1))
        if page < 1:
            raise InvalidParameterException('page must be greater than or equal to 1')

        return page

    def filter_and_transform_results(self, data, mapper):
        if 'results' not in data:
            return data

        results = []
        for item in data['results']:
            mapped_item = mapper.map_search_item(item, ContentType.TV_SHOW)
            results.append(mapped_item.to_dict())

        metadata = {
            'page': data.get('page'),
            'page_results': len(results),
            'total_pages': data.get('total_pages'),
            'total_results': data.get('total_results')
        }

        return {'metadata': metadata, 'results': results}

    @extend_schema(
        tags=['Proxy - TV Shows'],
        summary='Search TV shows',
        description='Search for TV shows by title using TMDB.',
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
        limit = self._validate_limit(request)

        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.search_tv_shows(query, page)
        if status_code != http_status.HTTP_200_OK:
            return Response(data, status=status_code)

        transformed_data = self.filter_and_transform_results(data, mapper)
        return Response(transformed_data, status=http_status.HTTP_200_OK)
