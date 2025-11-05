from .base import TMDBBaseView
from .utils import normalize_season
from proxy.serializers import TVSeasonDetailSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.response import Response
from rest_framework import status as http_status

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

        # Fetch season details
        season_data, season_status = client.get_season_details(int(tv_id), int(season_number))

        if season_status != http_status.HTTP_200_OK:
            return self.transform_response(season_data, season_status)

        # Fetch TV show details to get name and backdrop
        tv_data, tv_status = client.get_tv_details(int(tv_id))

        tv_show_name = None
        tv_show_backdrop_path = None

        if tv_status == http_status.HTTP_200_OK:
            tv_show_name = tv_data.get('name')
            tv_show_backdrop_path = tv_data.get('backdrop_path')

        # Normalize season with TV show information
        normalized_data = normalize_season(
            season_data,
            tv_show_name=tv_show_name,
            tv_show_backdrop_path=tv_show_backdrop_path
        )

        return Response(normalized_data, status=http_status.HTTP_200_OK)
