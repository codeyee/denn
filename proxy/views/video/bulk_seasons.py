from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from proxy.serializers import BulkSeasonsResponseSerializer, ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from proxy.exceptions import MissingParameterError, InvalidParameterError
from .base import TMDBBaseView
from concurrent.futures import ThreadPoolExecutor

class VideoBulkSeasonsView(TMDBBaseView):
    @extend_schema(
        tags=['Proxy - Video'],
        summary='Bulk get TV season details',
        description='Retrieve detailed information about multiple TV seasons from TMDB in a single request. Returns a dictionary with "tv_id:season_number" keys and season details (or null) as values.',
        parameters=[
            OpenApiParameter(
                'seasons',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=True,
                description='Comma-separated list of TV show ID and season number pairs (e.g., "1396:1,1396:2,94605:1")'
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
            200: BulkSeasonsResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        seasons_param = request.query_params.get('seasons', '')

        if not seasons_param:
            raise MissingParameterError('seasons')

        season_requests = []
        for item in seasons_param.split(','):
            item = item.strip()
            if not item:
                continue

            try:
                tv_show, season = item.split(':')
                tv_show_id = int(tv_show.strip())
                season_number = int(season.strip())
                season_requests.append({
                    'tv_show_id': tv_show_id,
                    'season_number': season_number
                })
            except (ValueError, AttributeError):
                raise InvalidParameterError(f'Invalid season format: "{item}". Expected format: "tv_show_id:season_number"')

        if len(season_requests) > 50:
            raise InvalidParameterError('Maximum 50 season requests allowed per request')

        client = self.get_client()
        mapper = TMDBMapper(client)
        country = request.query_params.get('country', None)

        results = {}
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {
                executor.submit(mapper.get_season_complete, season_request['tv_show_id'], season_request['season_number'], country): season_request
                for season_request in season_requests
            }

            for future in futures:
                season_request = futures[future]
                season, status = future.result()

                result_key = f"{season_request['tv_show_id']}:{season_request['season_number']}"
                results[result_key] = season.to_dict() if season else None

        return Response(results, status=http_status.HTTP_200_OK)
