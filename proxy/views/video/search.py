from .base import TMDBBaseView
from proxy.errors import build_error_response, get_http_status, MISSING_QUERY
from proxy.serializers import VideoSearchResponseSerializer, ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from proxy.constants import MediaType
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.response import Response
from rest_framework import status as http_status


class VideoSearchView(TMDBBaseView):
    def filter_and_transform_results(self, data, mapper):
        if 'results' not in data:
            return data

        results = []
        for item in data['results']:
            raw_media_type = item.get('media_type', '').lower()
            if raw_media_type == 'person':
                continue

            mapped_item = mapper.map_search_item(item)
            results.append(mapped_item.to_dict())

        metadata = {
            'page': data.get('page'),
            'page_results': len(results),
            'total_pages': data.get('total_pages'),
            'total_results': data.get('total_results')
        }

        return {'metadata': metadata, 'results': results}

    @extend_schema(
        tags=['Proxy - Video'],
        summary='Search movies and TV shows',
        description='Search for movies and TV shows by title using TMDB. Returns a normalized list of results with metadata for pagination. Person results are automatically filtered out.',
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
            200: VideoSearchResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        query = request.query_params.get('query')

        if not query:
            error_response = build_error_response(MISSING_QUERY)
            return self.transform_response(error_response, get_http_status(MISSING_QUERY))

        page = int(request.query_params.get('page', 1))

        client = self.get_client()
        mapper = TMDBMapper(client)
        data, status_code = client.search(query, page)

        if status_code != http_status.HTTP_200_OK:
            return self.transform_response(data, status_code)

        transformed_data = self.filter_and_transform_results(data, mapper)
        return Response(transformed_data, status=http_status.HTTP_200_OK)
