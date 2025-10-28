from .base import TMDBBaseView
from .utils import normalize_movie
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes


class VideoMovieDetailView(TMDBBaseView):
    @extend_schema(
        tags=['Proxy - Video'],
        summary='Get movie details',
        description='Retrieve detailed information about a specific movie from TMDB.',
        parameters=[
            OpenApiParameter('movie_id', OpenApiTypes.INT, OpenApiParameter.PATH, required=True, description='TMDB movie ID')
        ],
        responses={
            200: OpenApiExample(
                'Movie Details',
                value={
                    'id': 1311031,
                    'title': 'Demon Slayer: Kimetsu no Yaiba -To the Hashira Training-',
                    'original_title': '鬼滅の刃 絆の奇跡、そして柱稽古へ',
                    'description': 'A compilation film featuring the eleventh episode...',
                    'image_url': 'https://image.tmdb.org/t/p/w500/iSMiF6DklX2aL9WVaNYfhFytwL4.jpg',
                    'release_date': '2024-02-02',
                    'duration_minutes': 110,
                    'status': 'Released'
                }
            ),
            404: OpenApiExample('Not Found', value={'error': 'RESOURCE_NOT_FOUND', 'message': 'Movie not found'})
        }
    )
    def get(self, request, movie_id):
        client = self.get_client()
        return self.handle_api_call(
            client.get_movie_details,
            transformer=normalize_movie,
            movie_id=int(movie_id)
        )
