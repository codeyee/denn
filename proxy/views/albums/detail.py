from rest_framework.response import Response
from rest_framework import status as http_status
from ..base import SpotifyBaseView
from core.exceptions import NotFoundException
from proxy.serializers.albums import AlbumDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class AlbumDetailView(SpotifyBaseView):
    @extend_schema(
        tags=['Proxy - Albums'],
        summary='Get album details',
        description='Retrieve detailed information about a specific album including all tracks.',
        parameters=[
            OpenApiParameter('album_id', OpenApiTypes.STR, OpenApiParameter.PATH, required=True, description='Spotify album ID')
        ],
        responses={
            200: AlbumDetailSerializer,
            404: ErrorResponseSerializer
        }
    )
    def get(self, request, album_id: str):
        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.get_album(album_id=album_id)

        if status_code != http_status.HTTP_200_OK:
            if status_code == http_status.HTTP_404_NOT_FOUND:
                raise NotFoundException('Album')
            return Response(data, status=status_code)

        album = mapper.map_detail(data)
        return Response(album.to_dict(), status=http_status.HTTP_200_OK)
