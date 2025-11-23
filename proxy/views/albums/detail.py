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
        description='''
        Retrieve detailed information about a specific album including all tracks.

        **Dynamic Field Selection:**
        Use the `fields` parameter to select specific fields and reduce response payload size.
        Supports dot notation for nested fields.

        **Examples:**
        - `?fields=id,name,release_date` - Return only basic album info
        - `?fields=id,name,tracks.name,tracks.duration_ms` - Get album with specific track fields only
        - `?fields=id,name,cover.url,artists.name` - Get only basic info with cover and artist names
        ''',
        parameters=[
            OpenApiParameter('album_id', OpenApiTypes.STR, OpenApiParameter.PATH, required=True, description='Spotify album ID'),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include. Supports dot notation for nested fields (e.g., "id,name,tracks.name")')
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
        album_dict = album.to_dict()
        album_dict = self.apply_dynamic_fields(album_dict, request)
        return Response(album_dict, status=http_status.HTTP_200_OK)
