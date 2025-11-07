from .base import TMDBBaseView
from proxy.serializers import VideoSuggestionsResponseSerializer, ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from proxy.constants import MediaType
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.response import Response
from rest_framework import status as http_status


class VideoSuggestionsView(TMDBBaseView):
    def transform_results(self, data, mapper):
        if 'results' not in data:
            return []

        results = []
        for item in data['results']:
            raw_media_type = item.get('media_type', '').lower()
            if raw_media_type == 'person':
                continue

            mapped_item = mapper.map_search_item(item)
            results.append(mapped_item.to_dict())

        return results

    @extend_schema(
        tags=['Proxy - Video'],
        summary='Get video suggestions',
        description='Get popular movies and TV shows for homepage suggestions. This endpoint fetches a mix of popular movies and TV shows from TMDB, ideal for displaying as recommendations on a homepage or discovery section.',
        parameters=[
            OpenApiParameter(
                'limit',
                OpenApiTypes.INT,
                description='Number of suggestions to return (default: 20, max: 100)'
            )
        ],
        responses={
            200: VideoSuggestionsResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        limit = int(request.query_params.get('limit', 20))
        limit = min(limit, 100)

        client = self.get_client()
        mapper = TMDBMapper(client)

        movies_data, movies_status = client.get_popular_movies(page=1)
        tv_data, tv_status = client.get_popular_tv(page=1)

        all_results = []

        if movies_status == http_status.HTTP_200_OK and 'results' in movies_data:
            all_results.extend(movies_data['results'][:limit])

        if tv_status == http_status.HTTP_200_OK and 'results' in tv_data:
            all_results.extend(tv_data['results'][:limit])

        results = self.transform_results({'results': all_results}, mapper)

        return Response(results, status=http_status.HTTP_200_OK)
