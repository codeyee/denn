from rest_framework.response import Response
from rest_framework import status as http_status
from ..base import IGDBBaseView
from proxy.exceptions import NotFoundException
from proxy.serializers.games import GameDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes


class GameDetailView(IGDBBaseView):
    @extend_schema(
        tags=['Proxy - Games'],
        summary='Get game details',
        description='Retrieve detailed information about a specific game from IGDB.',
        parameters=[
            OpenApiParameter('game_id', OpenApiTypes.INT, OpenApiParameter.PATH, required=True, description='IGDB game ID')
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

        if isinstance(data, list) and len(data) > 0:
            game = mapper.map_detail(data[0])
            return Response(game.to_dict(), status=http_status.HTTP_200_OK)

        raise NotFoundException('Game')
