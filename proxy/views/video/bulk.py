from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from proxy.serializers import BulkMovieItemSerializer, BulkTVShowItemSerializer, ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from proxy.exceptions import MissingParameterError, InvalidParameterError
from .base import TMDBBaseView
from concurrent.futures import ThreadPoolExecutor


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
            raise MissingParameterError('ids')

        try:
            movie_ids = [int(id.strip()) for id in ids_param.split(',') if id.strip()]
        except ValueError:
            raise InvalidParameterError('Invalid movie IDs. Must be comma-separated integers.')

        if not movie_ids:
            raise InvalidParameterError('No valid movie IDs provided')

        if len(movie_ids) > 50:
            raise InvalidParameterError('Maximum 50 movie IDs allowed per request')

        client = self.get_client()
        mapper = TMDBMapper(client)
        country = request.query_params.get('country', None)

        results = {}
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(mapper.get_movie_complete, movie_id, country): movie_id for movie_id in movie_ids}
            for future in futures:
                movie_id = futures[future]
                movie, status = future.result()

                if status == http_status.HTTP_200_OK:
                    results[movie_id] = movie.to_dict()
                else:
                    results[movie_id] = None

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
            raise MissingParameterError('ids')

        try:
            tv_ids = [int(id.strip()) for id in ids_param.split(',') if id.strip()]
        except ValueError:
            raise InvalidParameterError('Invalid TV show IDs. Must be comma-separated integers.')

        if not tv_ids:
            raise InvalidParameterError('No valid TV show IDs provided')

        if len(tv_ids) > 50:
            raise InvalidParameterError('Maximum 50 TV show IDs allowed per request')

        client = self.get_client()
        mapper = TMDBMapper(client)
        country = request.query_params.get('country', None)

        results = {}
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(mapper.get_tv_show_complete, tv_id, country): tv_id for tv_id in tv_ids}
            for future in futures:
                tv_id = futures[future]
                tv_show, status = future.result()

                if status == http_status.HTTP_200_OK:
                    results[tv_id] = tv_show.to_dict()
                else:
                    results[tv_id] = None

        return Response(results, status=http_status.HTTP_200_OK)
