from ..base import TMDBBaseView
from proxy.serializers.tv_shows import TVSeasonDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from core.exceptions import NotFoundException, InvalidParameterException
from proxy.constants import ContentType
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.response import Response
from rest_framework import status as http_status


class TVSeasonDetailView(TMDBBaseView):

    def _validate_country(self, request):
        country = request.query_params.get('country', None)
        if country and len(country) != 2:
            raise InvalidParameterException('Country must be a valid ISO 3166-1 alpha-2 code')

        return country

    @extend_schema(
        tags=['Proxy - TV Shows'],
        summary='Get TV season details',
        description='''
        Retrieve detailed information about a specific season including all episodes.

        **Dynamic Field Selection:**
        Use the `fields` parameter to select specific fields and reduce response payload size.
        Supports dot notation for nested fields.

        **Examples:**
        - `?fields=id,name,air_date` - Return only basic season info
        - `?fields=id,name,episodes.title,episodes.episode_number` - Get season with specific episode fields only
        - `?fields=episodes.title,episodes.air_date` - Get only episode titles and air dates
        ''',
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
            ),
            OpenApiParameter(
                'fields',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=False,
                description='Comma-separated list of fields to include. Supports dot notation for nested fields (e.g., "id,episodes.title")'
            )
        ],
        responses={
            200: TVSeasonDetailSerializer,
            404: ErrorResponseSerializer
        }
    )
    def get(self, request, tv_id, season_number):
        tv_id = int(tv_id)
        season_number = int(season_number)
        country = self._validate_country(request)

        client = self.get_client()
        mapper = self.get_mapper()

        season, status_code = mapper.get_season_complete(
            tv_id=tv_id,
            season_number=season_number,
            country=country
        )
        if status_code != http_status.HTTP_200_OK or not season:
            raise NotFoundException(ContentType.SEASON)

        data = season.to_dict()
        data = self.apply_dynamic_fields(data, request)
        return Response(data, status=http_status.HTTP_200_OK)
