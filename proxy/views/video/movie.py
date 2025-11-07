from .base import TMDBBaseView
from proxy.serializers import MovieDetailSerializer, ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from proxy.exceptions import NotFoundError
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.response import Response
from rest_framework import status as http_status


class VideoMovieDetailView(TMDBBaseView):
    @extend_schema(
        tags=['Proxy - Video'],
        summary='Get movie details',
        description='Retrieve detailed information about a specific movie from TMDB.',
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

        movie, status_code = mapper.get_movie_complete(int(movie_id), country)
        if status_code != http_status.HTTP_200_OK or not movie:
            raise NotFoundError('Movie')

        return Response(movie.to_dict(), status=http_status.HTTP_200_OK)
