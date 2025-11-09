from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from proxy.serializers.movies import MovieDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from core.exceptions import MissingParameterException, InvalidParameterException
from ..base import TMDBBaseView
from concurrent.futures import ThreadPoolExecutor


class MovieBulkView(TMDBBaseView):

    def _validate_ids(self, request):
        ids_param = request.query_params.get('ids', '')
        if not ids_param:
            raise MissingParameterException('ids')

        return ids_param

    def _validate_movie_ids(self, ids_param):
        movie_ids = [id.strip() for id in ids_param.split(',') if id.strip()]

        if not movie_ids:
            raise InvalidParameterException('No valid movie IDs provided')

        return movie_ids

    def _validate_max_ids(self, movie_ids):
        if len(movie_ids) > 50:
            raise InvalidParameterException('Maximum 50 movie IDs allowed per request')

        return movie_ids

    def _validate_country(self, request):
        country = request.query_params.get('country', None)
        if country and len(country) != 2:
            raise InvalidParameterException('Country must be a valid ISO 3166-1 alpha-2 code')

        return country

    @extend_schema(
        tags=['Proxy - Movies'],
        summary='Bulk get movie details',
        description='Retrieve detailed information about multiple movies from TMDB in a single request. Returns a list of movie details.',
        parameters=[
            OpenApiParameter(
                'ids',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=True,
                description='Comma-separated list of TMDB movie IDs (e.g., "550,680,27205")'
            ),
            OpenApiParameter(
                'country',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=False,
                description='ISO 3166-1 alpha-2 country code (e.g., US, GB, FR) to filter providers by country'
            )
        ],
        responses={
            200: MovieDetailSerializer(many=True),
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        ids_param = self._validate_ids(request)
        movie_ids = self._validate_movie_ids(ids_param)
        movie_ids = self._validate_max_ids(movie_ids)
        country = self._validate_country(request)

        client = self.get_client()
        mapper = self.get_mapper()

        results = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(mapper.get_movie_complete, movie_id, country): movie_id for movie_id in movie_ids}
            for future in futures:
                movie, status = future.result()

                if status == http_status.HTTP_200_OK and movie:
                    results.append(movie.to_dict())

        return Response(results, status=http_status.HTTP_200_OK)
