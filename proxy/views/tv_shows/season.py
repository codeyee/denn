from ..base import TMDBBaseView
from proxy.serializers.tv_shows import TVSeasonDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from proxy.exceptions import NotFoundException
from proxy.constants import MediaType
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.response import Response
from rest_framework import status as http_status


class TVSeasonDetailView(TMDBBaseView):
    @extend_schema(
        tags=['Proxy - TV Shows'],
        summary='Get TV season details',
        description='Retrieve detailed information about a specific season including all episodes.',
        parameters=[
            OpenApiParameter(
                'tv_id',
                OpenApiTypes.INT,
                OpenApiParameter.PATH,
                required=True,
                description='TMDB TV show ID'
            ),
            OpenApiParameter(
                'season_number',
                OpenApiTypes.INT,
                OpenApiParameter.PATH,
                required=True,
                description='Season number'
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
            200: TVSeasonDetailSerializer,
            404: ErrorResponseSerializer
        }
    )
    def get(self, request, tv_id, season_number):
        client = self.get_client()
        mapper = TMDBMapper(client)
        country = request.query_params.get('country', None)

        season, status_code = mapper.get_season_complete(
            tv_id=int(tv_id),
            season_number=int(season_number),
            country=country
        )
        if status_code != http_status.HTTP_200_OK or not season:
            raise NotFoundException(MediaType.SEASON)

        return Response(season.to_dict(), status=http_status.HTTP_200_OK)
