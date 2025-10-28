from .base import TMDBBaseView
from .utils import normalize_movie
from proxy.serializers import MovieDetailSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
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
            200: MovieDetailSerializer,
            404: ErrorResponseSerializer
        }
    )
    def get(self, request, movie_id):
        client = self.get_client()
        return self.handle_api_call(
            client.get_movie_details,
            transformer=normalize_movie,
            movie_id=int(movie_id)
        )
