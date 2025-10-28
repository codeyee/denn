from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from .base import TMDBBaseView
from .utils import normalize_movie, normalize_tv

class VideoBulkMoviesView(TMDBBaseView):
    @extend_schema(
        tags=['Proxy - Video'],
        summary='Bulk get movie details',
        description='Retrieve detailed information about multiple movies from TMDB in a single request.',
        parameters=[
            OpenApiParameter(
                'ids',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=True,
                description='Comma-separated list of TMDB movie IDs (e.g., "550,680,27205")'
            )
        ],
        responses={
            200: OpenApiExample(
                'Bulk Movie Details',
                value=[
                    {
                        'id': 550,
                        'data': {
                            'id': 550,
                            'title': 'Fight Club',
                            'original_title': 'Fight Club',
                            'description': 'A ticking-time-bomb insomniac...',
                            'image_url': 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
                            'release_date': '1999-10-15',
                            'duration_minutes': 139,
                            'status': 'Released'
                        },
                        'status_code': 200,
                        'error': None
                    }
                ]
            ),
            400: OpenApiExample(
                'Bad Request',
                value={'error': 'INVALID_REQUEST', 'message': 'Missing or invalid ids parameter'}
            )
        }
    )
    def get(self, request):
        ids_param = request.query_params.get('ids', '')

        if not ids_param:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'Missing ids parameter'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        try:
            movie_ids = [int(id.strip()) for id in ids_param.split(',') if id.strip()]
        except ValueError:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'Invalid movie IDs. Must be comma-separated integers.'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        if not movie_ids:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'No valid movie IDs provided'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        if len(movie_ids) > 50:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'Maximum 50 movie IDs allowed per request'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        client = self.get_client()
        results, _ = client.get_bulk_movies(movie_ids)

        for result in results:
            if result['status_code'] == 200 and result['data']:
                result['data'] = normalize_movie(result['data'])

        return Response(results, status=http_status.HTTP_200_OK)

class VideoBulkTvShowsView(TMDBBaseView):
    @extend_schema(
        tags=['Proxy - Video'],
        summary='Bulk get TV show details',
        description='Retrieve detailed information about multiple TV shows from TMDB in a single request.',
        parameters=[
            OpenApiParameter(
                'ids',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=True,
                description='Comma-separated list of TMDB TV show IDs (e.g., "1396,1668,94605")'
            )
        ],
        responses={
            200: OpenApiExample(
                'Bulk TV Show Details',
                value=[
                    {
                        'id': 1396,
                        'data': {
                            'id': 1396,
                            'title': 'Breaking Bad',
                            'original_title': 'Breaking Bad',
                            'description': 'When Walter White, a New Mexico chemistry teacher...',
                            'image_url': 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
                            'release_date': '2008-01-20',
                            'status': 'Ended',
                            'number_of_seasons': 5,
                            'number_of_episodes': 62,
                            'seasons': []
                        },
                        'status_code': 200,
                        'error': None
                    }
                ]
            ),
            400: OpenApiExample(
                'Bad Request',
                value={'error': 'INVALID_REQUEST', 'message': 'Missing or invalid ids parameter'}
            )
        }
    )
    def get(self, request):
        ids_param = request.query_params.get('ids', '')

        if not ids_param:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'Missing ids parameter'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        try:
            tv_ids = [int(id.strip()) for id in ids_param.split(',') if id.strip()]
        except ValueError:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'Invalid TV show IDs. Must be comma-separated integers.'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        if not tv_ids:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'No valid TV show IDs provided'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        if len(tv_ids) > 50:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'Maximum 50 TV show IDs allowed per request'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        client = self.get_client()
        results, _ = client.get_bulk_tv_shows(tv_ids)

        for result in results:
            if result['status_code'] == 200 and result['data']:
                result['data'] = normalize_tv(result['data'])

        return Response(results, status=http_status.HTTP_200_OK)
