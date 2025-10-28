from .base import SpotifyBaseView
from .utils import normalize_album
from proxy.serializers import AlbumDetailSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class MusicAlbumDetailView(SpotifyBaseView):
    @extend_schema(
        tags=['Proxy - Music'],
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
        return self.handle_api_call(
            client.get_album,
            transformer=normalize_album,
            album_id=album_id
        )

