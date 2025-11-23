from ..base import TMDBBaseView
from proxy.serializers.movies import MovieDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from core.exceptions import NotFoundException
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.response import Response
from rest_framework import status as http_status


class MovieDetailView(TMDBBaseView):
    @extend_schema(
        tags=['Proxy - Movies'],
        summary='Get movie details',
        description='''
        Retrieve detailed information about a specific movie from TMDB.

        **Optional Query Parameters:**
        - `country`: ISO 3166-1 alpha-2 country code (e.g., US, GB, FR) to filter providers by country.
        - `fields`: Comma-separated list of fields to include. Supports dot notation for nested fields.

        **Dynamic Field Selection Examples:**
        - `?fields=id,title,description` - Return only basic info
        - `?fields=id,title,cover.url,backdrop.url` - Include specific image URLs
        - `?fields=id,title,providers.provider_name` - Get all provider names
        - `?fields=id,runtime,external_ids.imdb_id` - Include runtime and IMDB ID only
        ''',
        parameters=[
            OpenApiParameter(
                'movie_id',
                OpenApiTypes.INT,
                OpenApiParameter.PATH,
                required=True,
                description='TMDB movie ID'
            ),
            OpenApiParameter(
                'country',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=False,
                description='ISO 3166-1 alpha-2 country code (e.g., US, GB, FR) to filter providers by country'
            ),
            OpenApiParameter(
                'fields',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=False,
                description='Comma-separated list of fields to include. Supports dot notation for nested fields (e.g., "id,title,cover.url")'
            )
        ],
        responses={
            200: MovieDetailSerializer,
            404: ErrorResponseSerializer
        }
    )
    def get(self, request, movie_id):
        client = self.get_client()
        mapper = TMDBMapper(client)
        country = request.query_params.get('country', None)

        movie, status_code = mapper.get_movie_complete(
            movie_id=int(movie_id),
            country=country
        )
        if status_code != http_status.HTTP_200_OK or not movie:
            raise NotFoundException('Movie')

        data = movie.to_dict()
        data = self.apply_dynamic_fields(data, request)
        return Response(data, status=http_status.HTTP_200_OK)
