from .base import TMDBBaseView
from .utils import normalize_search_item
from proxy.serializers import VideoSuggestionsResponseSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class VideoSuggestionsView(TMDBBaseView):
    def transform_results(self, data):
        if 'results' not in data: return {'results': [], 'count': 0}

        results = []
        for item in data['results']:
            if item.get('media_type') == 'person': continue
            results.append(normalize_search_item(item))

        return {
            'results': results,
            'count': len(results)
        }

    @extend_schema(
        tags=['Proxy - Video'],
        summary='Get video suggestions',
        description='''
        Get popular movies and TV shows for homepage suggestions.

        This endpoint fetches a mix of popular movies and TV shows from TMDB,
        ideal for displaying as recommendations on a homepage or discovery section.
        ''',
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

        movies_data, movies_status = client.get_popular_movies(page=1)
        tv_data, tv_status = client.get_popular_tv(page=1)

        all_results = []

        if movies_status == 200 and 'results' in movies_data:
            all_results.extend(movies_data['results'][:limit])

        if tv_status == 200 and 'results' in tv_data:
            all_results.extend(tv_data['results'][:limit])

        transformed_data = self.transform_results({'results': all_results})

        return self.transform_response(transformed_data, 200)
