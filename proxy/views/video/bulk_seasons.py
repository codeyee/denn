from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from proxy.serializers import BulkSeasonItemSerializer, ErrorResponseSerializer
from .base import TMDBBaseView
from .utils import normalize_season

class VideoBulkSeasonsView(TMDBBaseView):
    @extend_schema(
        tags=['Proxy - Video'],
        summary='Bulk get TV season details',
        description='Retrieve detailed information about multiple TV seasons from TMDB in a single request. Format: "tv_id:season_number" (e.g., "1396:1,1396:2,94605:1")',
        parameters=[
            OpenApiParameter(
                'seasons',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=True,
                description='Comma-separated list of TV show ID and season number pairs (e.g., "1396:1,1396:2,94605:1")'
            )
        ],
        responses={
            200: BulkSeasonItemSerializer(many=True),
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        seasons_param = request.query_params.get('seasons', '')

        if not seasons_param:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'Missing seasons parameter'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        season_requests = []
        for item in seasons_param.split(','):
            item = item.strip()
            if not item:
                continue

            try:
                tv_id_str, season_number_str = item.split(':')
                tv_id = int(tv_id_str.strip())
                season_number = int(season_number_str.strip())
                season_requests.append({'tv_id': tv_id, 'season_number': season_number})
            except (ValueError, AttributeError):
                return Response(
                    {'error': 'INVALID_REQUEST', 'message': f'Invalid season format: "{item}". Expected format: "tv_id:season_number"'},
                    status=http_status.HTTP_400_BAD_REQUEST
                )

        if not season_requests:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'No valid season requests provided'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        if len(season_requests) > 50:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'Maximum 50 season requests allowed per request'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        client = self.get_client()
        results, _ = client.get_bulk_seasons(season_requests)

        for result in results:
            if result['status_code'] == 200 and result['data']:
                result['data'] = normalize_season(result['data'])

        return Response(results, status=http_status.HTTP_200_OK)
