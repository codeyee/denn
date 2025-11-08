from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from proxy.serializers import GameDetailSerializer, ErrorResponseSerializer
from proxy.exceptions import MissingParameterError
from .base import IGDBBaseView

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
            200: GameDetailSerializer(many=True),
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        ids_param = request.query_params.get('ids', '')
        if not ids_param:
            raise MissingParameterError('ids')

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
        mapper = self.get_mapper()

        data, status_code = client.get_bulk_games(game_ids)

        if status_code != http_status.HTTP_200_OK:
            return Response(data, status=status_code)

        if isinstance(data, list):
            games = [mapper.map_detail(game).to_dict() for game in data]
            return Response(games, status=http_status.HTTP_200_OK)

        return Response(data, status=status_code)
