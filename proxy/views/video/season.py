from .base import TMDBBaseView
from .utils import normalize_season, normalize_providers
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
            OpenApiParameter('season_number', OpenApiTypes.INT, OpenApiParameter.PATH, required=True, description='Season number'),
            OpenApiParameter('country', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='ISO 3166-1 alpha-2 country code (e.g., US, GB, FR) to filter providers by country')
        ],
        responses={
            200: TVSeasonDetailSerializer,
            404: ErrorResponseSerializer
        }
    )
    def get(self, request, tv_id, season_number):
        client = self.get_client()
        tv_id_int = int(tv_id)
        season_number_int = int(season_number)
        country_code = request.query_params.get('country', None)

        # Fetch season details
        season_data, season_status = client.get_season_details(tv_id_int, season_number_int)

        if season_status != http_status.HTTP_200_OK:
            return self.transform_response(season_data, season_status)

        # Fetch TV show details to get name and backdrop
        tv_data, tv_status = client.get_tv_details(tv_id_int)

        tv_show_name = None
        tv_show_backdrop_path = None

        if tv_status == http_status.HTTP_200_OK:
            tv_show_name = tv_data.get('name')
            tv_show_backdrop_path = tv_data.get('backdrop_path')

        # Fetch external IDs and watch providers for season
        external_ids_data, external_ids_status = client.get_season_external_ids(tv_id_int, season_number_int)
        watch_providers_data, watch_providers_status = client.get_season_watch_providers(tv_id_int, season_number_int)

        # Normalize season with TV show information
        normalized_data = normalize_season(
            season_data,
            tv_show_name=tv_show_name,
            tv_show_backdrop_path=tv_show_backdrop_path
        )

        # Add external IDs (use imdb_id from external_ids if available)
        if external_ids_status == http_status.HTTP_200_OK and external_ids_data:
            normalized_data['external_ids'] = external_ids_data
            # Update imdb_id from external_ids if available
            if external_ids_data.get('imdb_id'):
                normalized_data['imdb_id'] = external_ids_data.get('imdb_id')

        # Add providers (normalized watch providers, filtered by country if provided)
        if watch_providers_status == http_status.HTTP_200_OK and watch_providers_data:
            normalized_data['providers'] = normalize_providers(watch_providers_data, country_code=country_code)

        return Response(normalized_data, status=http_status.HTTP_200_OK)
