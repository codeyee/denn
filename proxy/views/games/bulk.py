from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from proxy.serializers.games import GameDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from core.exceptions import MissingParameterException, InvalidParameterException
from ..base import IGDBBaseView

class GameBulkView(IGDBBaseView):

    def _validate_ids(self, request):
        ids_param = request.query_params.get('ids', '')
        if not ids_param:
            raise MissingParameterException('ids')

        return ids_param

    def _validate_game_ids(self, ids_param):
        game_ids = [id.strip() for id in ids_param.split(',') if id.strip()]

        if not game_ids:
            raise InvalidParameterException('No valid game IDs provided')

        return game_ids

    def _validate_max_ids(self, game_ids):
        if len(game_ids) > 100:
            raise InvalidParameterException('Maximum 100 game IDs allowed per request')

        return game_ids

    @extend_schema(
        tags=['Proxy - Games'],
        summary='Bulk get game details',
        description='''
        Retrieve detailed information about multiple games from IGDB in a single request.

        **Dynamic Field Selection:**
        Use the `fields` parameter to optimize the response by selecting only the fields you need.

        **Examples:**
        - `?ids=25076,1020&fields=id,name,release_date` - Get basic info for multiple games
        - `?ids=25076,1020&fields=id,name,cover.url` - Include cover URLs
        - `?ids=25076,1020&fields=id,name,genres.name,platforms.name` - Include specific nested fields
        ''',
        parameters=[
            OpenApiParameter(
                'ids',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=True,
                description='Comma-separated list of IGDB game IDs (e.g., "25076,1020,19560")'
            ),
            OpenApiParameter(
                'fields',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=False,
                description='Comma-separated list of fields to include. Supports dot notation for nested fields (e.g., "id,name,cover.url")'
            )
        ],
        responses={
            200: GameDetailSerializer(many=True),
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        ids_param = self._validate_ids(request)
        game_ids = self._validate_game_ids(ids_param)
        game_ids = self._validate_max_ids(game_ids)

        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.get_bulk_games(game_ids)

        if status_code != http_status.HTTP_200_OK:
            return Response(data, status=status_code)

        if isinstance(data, list):
            games = [mapper.map_detail(game).to_dict() for game in data]
            games = self.apply_dynamic_fields(games, request)
            return Response(games, status=http_status.HTTP_200_OK)

        return Response(data, status=status_code)