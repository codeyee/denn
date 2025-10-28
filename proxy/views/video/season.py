from .base import TMDBBaseView
from .utils import normalize_season
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class VideoTvSeasonDetailView(TMDBBaseView):
    @extend_schema(
        tags=['Proxy - Video'],
        summary='Get TV season details',
        description='Retrieve detailed information about a specific season including all episodes.',
        parameters=[
            OpenApiParameter('tv_id', OpenApiTypes.INT, OpenApiParameter.PATH, required=True, description='TMDB TV show ID'),
            OpenApiParameter('season_number', OpenApiTypes.INT, OpenApiParameter.PATH, required=True, description='Season number')
        ],
        responses={
            200: OpenApiExample(
                'Season Details',
                value={
                    'id': 118399,
                    'season_number': 1,
                    'title': 'Season 1',
                    'description': 'It is the Taisho Period in Japan...',
                    'release_date': '2019-04-06',
                    'image_url': 'https://image.tmdb.org/t/p/w500/vHRYk7oLYWgGM6mBAX40qYFYvCf.jpg',
                    'number_of_episodes': 26,
                    'episodes': [
                        {
                            'id': 1551914,
                            'episode_number': 1,
                            'season_number': 1,
                            'episode_type': 'standard',
                            'title': 'Cruelty',
                            'description': 'Since ancient times, rumors have abounded...',
                            'release_date': '2019-04-06',
                            'duration_minutes': 24,
                            'image_url': 'https://image.tmdb.org/t/p/w500/oHPf5AM5ySGKkbZJQQ8KxF5h9xY.jpg'
                        }
                    ]
                }
            ),
            404: OpenApiExample('Not Found', value={'error': 'RESOURCE_NOT_FOUND', 'message': 'Season not found'})
        }
    )
    def get(self, request, tv_id, season_number):
        client = self.get_client()
        return self.handle_api_call(
            client.get_season_details,
            transformer=normalize_season,
            tv_id=int(tv_id),
            season_number=int(season_number)
        )
