from proxy.views.base import TMDBBaseView
from proxy.exceptions import MissingParameterException, InvalidParameterException
from proxy.serializers.movies import MovieSearchResponseSerializer
from proxy.serializers.common import ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from proxy.constants import ContentType
from core.pagination import build_pagination_metadata
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.response import Response
from rest_framework import status as http_status


class MovieSearchView(TMDBBaseView):

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
            mapped_item = mapper.map_search_item(item, ContentType.MOVIE)
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
        tags=['Proxy - Movies'],
        summary='Search movies',
        description='Search for movies by title using TMDB.',
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
            )
        ],
        responses={
            200: MovieSearchResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        query = self._validate_query(request)
        page = self._validate_page(request)
        page_size = self._validate_page_size(request)

        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.search_movies(query, page)
        if status_code != http_status.HTTP_200_OK:
            return Response(data, status=status_code)

        transformed_data = self.filter_and_transform_results(data, mapper, request, page_size)
        return Response(transformed_data, status=http_status.HTTP_200_OK)
