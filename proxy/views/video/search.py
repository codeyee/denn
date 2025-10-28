from .base import TMDBBaseView
from .utils import normalize_search_item
from proxy.errors import build_error_response, get_http_status, MISSING_QUERY
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes


class VideoSearchView(TMDBBaseView):
    def filter_and_transform_results(self, data):
        if 'results' not in data: return data
        results = []

        for item in data['results']:
            if item.get('media_type') == 'person': continue
            results.append(normalize_search_item(item))

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
        description='''
        Search for movies and TV shows by title using TMDB.

        Returns a normalized list of results with metadata for pagination.
        Person results are automatically filtered out.
        ''',
        parameters=[
            OpenApiParameter('query', OpenApiTypes.STR, required=True, description='Search query'),
            OpenApiParameter('page', OpenApiTypes.INT, description='Page number (default: 1)')
        ],
        responses={
            200: OpenApiExample(
                'Search Results',
                value={
                    'metadata': {
                        'page': 1,
                        'page_results': 2,
                        'total_pages': 5,
                        'total_results': 48
                    },
                    'results': [
                        {
                            'id': 85937,
                            'type': 'tv',
                            'title': 'Demon Slayer: Kimetsu no Yaiba',
                            'original_title': '鬼滅の刃',
                            'description': 'It is the Taisho Period in Japan...',
                            'image_url': 'https://image.tmdb.org/t/p/w500/wrCVHI5ErwXKGTeYIujENqiKLn3.jpg',
                            'release_date': '2019-04-06'
                        },
                        {
                            'id': 1311031,
                            'type': 'movie',
                            'title': 'Demon Slayer: Kimetsu no Yaiba -To the Hashira Training-',
                            'original_title': '鬼滅の刃 絆の奇跡、そして柱稽古へ',
                            'description': 'A compilation film featuring...',
                            'image_url': 'https://image.tmdb.org/t/p/w500/iSMiF6DklX2aL9WVaNYfhFytwL4.jpg',
                            'release_date': '2024-02-02'
                        }
                    ]
                }
            ),
            400: OpenApiExample('Missing Query', value={'error': 'MISSING_QUERY', 'message': 'Query parameter is required'})
        }
    )
    def get(self, request):
        query = request.query_params.get('query')

        if not query:
            error_response = build_error_response(MISSING_QUERY)
            return self.transform_response(error_response, get_http_status(MISSING_QUERY))

        page = int(request.query_params.get('page', 1))

        client = self.get_client()
        return self.handle_api_call(
            client.search,
            transformer=self.filter_and_transform_results,
            query=query,
            page=page
        )
