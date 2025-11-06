from .base import TMDBBaseView
from .utils import normalize_tv, normalize_providers
from proxy.serializers import TVShowDetailSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.response import Response
from rest_framework import status as http_status

class VideoTvDetailView(TMDBBaseView):
    @extend_schema(
        tags=['Proxy - Video'],
        summary='Get TV show details',
        description='Retrieve detailed information about a specific TV show including all seasons.',
        parameters=[
            OpenApiParameter('tv_id', OpenApiTypes.INT, OpenApiParameter.PATH, required=True, description='TMDB TV show ID'),
            OpenApiParameter('country', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='ISO 3166-1 alpha-2 country code (e.g., US, GB, FR) to filter providers by country')
        ],
        responses={
            200: TVShowDetailSerializer,
            404: ErrorResponseSerializer
        }
    )
    def get(self, request, tv_id):
        client = self.get_client()
        tv_id_int = int(tv_id)
        country_code = request.query_params.get('country', None)

        # Fetch TV show details
        tv_data, tv_status = client.get_tv_details(tv_id_int)
        if tv_status != http_status.HTTP_200_OK:
            return self.transform_response(tv_data, tv_status)

        # Fetch external IDs and watch providers
        external_ids_data, external_ids_status = client.get_tv_external_ids(tv_id_int)
        watch_providers_data, watch_providers_status = client.get_tv_watch_providers(tv_id_int)

        # Normalize TV show data
        normalized_data = normalize_tv(tv_data)

        # Add external IDs (use imdb_id from external_ids if available)
        if external_ids_status == http_status.HTTP_200_OK and external_ids_data:
            normalized_data['external_ids'] = external_ids_data
            # Update imdb_id from external_ids if available
            if external_ids_data.get('imdb_id'):
                normalized_data['imdb_id'] = external_ids_data.get('imdb_id')

        # Add providers (normalized watch providers, filtered by country if provided)
        if watch_providers_status == http_status.HTTP_200_OK and watch_providers_data:
            providers_result = normalize_providers(watch_providers_data, country_code=country_code)
            # If country_code is provided and result is a list, wrap it in a dict with country code as key
            if country_code and isinstance(providers_result, list):
                normalized_data['providers'] = {country_code.upper(): providers_result}
            else:
                normalized_data['providers'] = providers_result

        return Response(normalized_data, status=http_status.HTTP_200_OK)
