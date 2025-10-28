from .base import TMDBBaseView
from .utils import normalize_season
from proxy.serializers import TVSeasonDetailSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
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
            200: TVSeasonDetailSerializer,
            404: ErrorResponseSerializer
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
