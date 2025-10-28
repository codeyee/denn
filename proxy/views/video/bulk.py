from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer
from drf_spectacular.types import OpenApiTypes
from proxy.serializers import BulkMovieItemSerializer, BulkTVShowItemSerializer, ErrorResponseSerializer
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
            200: BulkMovieItemSerializer(many=True),
            400: ErrorResponseSerializer
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
            200: BulkTVShowItemSerializer(many=True),
            400: ErrorResponseSerializer
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
