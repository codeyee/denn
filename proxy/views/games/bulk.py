from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from .base import IGDBBaseView
from .utils import normalize_item

class GamesBulkView(IGDBBaseView):
    @extend_schema(
        tags=['Proxy - Games'],
        summary='Bulk get game details',
        description='Retrieve detailed information about multiple games from IGDB in a single request.',
        parameters=[
            OpenApiParameter(
                'ids',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=True,
                description='Comma-separated list of IGDB game IDs (e.g., "25076,1020,19560")'
            )
        ],
        responses={
            200: OpenApiExample(
                'Bulk Game Details',
                value=[
                    {
                        'id': 25076,
                        'title': 'Red Dead Redemption 2',
                        'type': 'Main game',
                        'release_date': '2018-10-26',
                        'description': 'America, 1899. The end of the Wild West era has begun...',
                        'image_url': 'https://images.igdb.com/igdb/image/upload/t_720p/co1q1f.jpg',
                        'authors': ['Rockstar Games'],
                        'platforms': ['PC (Microsoft Windows)', 'PlayStation 4', 'Xbox One']
                    }
                ]
            ),
            400: OpenApiExample(
                'Bad Request',
                value={'error': 'INVALID_REQUEST', 'message': 'Missing or invalid ids parameter'}
            )
        }
    )
    def get(self, request):
        ids_param = request.query_params.get('ids', '')

        if not ids_param:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'Missing ids parameter'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        try:
            game_ids = [int(id.strip()) for id in ids_param.split(',') if id.strip()]
        except ValueError:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'Invalid game IDs. Must be comma-separated integers.'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        if not game_ids:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'No valid game IDs provided'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        if len(game_ids) > 100:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'Maximum 100 game IDs allowed per request'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        client = self.get_client()
        data, status_code = client.get_bulk_games(game_ids)

        if status_code == 200:
            if isinstance(data, list):
                normalized_games = [normalize_item(game) for game in data]
                return Response(normalized_games, status=http_status.HTTP_200_OK)

        return Response(data, status=status_code)
