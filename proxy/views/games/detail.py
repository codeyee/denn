from rest_framework.response import Response
from rest_framework import status as http_status
from ..base import IGDBBaseView
from core.exceptions import NotFoundException
from proxy.serializers.games import GameDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes


class GameDetailView(IGDBBaseView):
    @extend_schema(
        tags=['Proxy - Games'],
        summary='Get game details',
        description='''
        Retrieve detailed information about a specific game from IGDB.

        **Dynamic Field Selection:**
        Use the `fields` parameter to select specific fields and reduce response payload size.
        Supports dot notation for nested fields.

        **Examples:**
        - `?fields=id,name,summary` - Return only basic info
        - `?fields=id,name,cover.url,screenshots.url` - Include specific image URLs
        - `?fields=id,name,genres.name,platforms.name` - Get only specific nested fields
        ''',
        parameters=[
            OpenApiParameter('game_id', OpenApiTypes.INT, OpenApiParameter.PATH, required=True, description='IGDB game ID'),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include. Supports dot notation for nested fields (e.g., "id,name,cover.url")')
        ],
        responses={
            200: GameDetailSerializer,
            404: ErrorResponseSerializer
        }
    )
    def get(self, request, game_id: int):
        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.get_game(game_id=int(game_id))

        if status_code != http_status.HTTP_200_OK:
            if status_code == http_status.HTTP_404_NOT_FOUND:
                raise NotFoundException('Game')
            return Response(data, status=status_code)

        if data is None:
            raise NotFoundException('Game')

        if isinstance(data, list) and len(data) > 0:
            game = mapper.map_detail(data[0])
            game_dict = game.to_dict()
            game_dict = self.apply_dynamic_fields(game_dict, request)
            return Response(game_dict, status=http_status.HTTP_200_OK)
        elif isinstance(data, dict):
            game = mapper.map_detail(data)
            game_dict = game.to_dict()
            game_dict = self.apply_dynamic_fields(game_dict, request)
            return Response(game_dict, status=http_status.HTTP_200_OK)

        raise NotFoundException('Game')
