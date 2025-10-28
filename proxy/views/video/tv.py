from .base import TMDBBaseView
from .utils import normalize_tv
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class VideoTvDetailView(TMDBBaseView):
    @extend_schema(
        tags=['Proxy - Video'],
        summary='Get TV show details',
        description='Retrieve detailed information about a specific TV show including all seasons.',
        parameters=[
            OpenApiParameter('tv_id', OpenApiTypes.INT, OpenApiParameter.PATH, required=True, description='TMDB TV show ID')
        ],
        responses={
            200: OpenApiExample(
                'TV Show Details',
                value={
                    'id': 85937,
                    'title': 'Demon Slayer: Kimetsu no Yaiba',
                    'original_title': '鬼滅の刃',
                    'description': 'It is the Taisho Period in Japan...',
                    'image_url': 'https://image.tmdb.org/t/p/w500/wrCVHI5ErwXKGTeYIujENqiKLn3.jpg',
                    'release_date': '2019-04-06',
                    'status': 'Returning Series',
                    'number_of_seasons': 5,
                    'number_of_episodes': 67,
                    'seasons': [
                        {
                            'id': 118399,
                            'season_number': 1,
                            'title': 'Season 1',
                            'description': 'It is the Taisho Period in Japan...',
                            'release_date': '2019-04-06',
                            'image_url': 'https://image.tmdb.org/t/p/w500/vHRYk7oLYWgGM6mBAX40qYFYvCf.jpg',
                            'number_of_episodes': 26
                        }
                    ]
                }
            ),
            404: OpenApiExample('Not Found', value={'error': 'RESOURCE_NOT_FOUND', 'message': 'TV show not found'})
        }
    )
    def get(self, request, tv_id):
        client = self.get_client()
        return self.handle_api_call(
            client.get_tv_details,
            transformer=normalize_tv,
            tv_id=int(tv_id)
        )
