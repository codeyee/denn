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
        Retrieve detailed information about a specific album from Spotify.

        **Dynamic Field Selection:**
        Use the `fields` parameter to select specific fields and reduce response payload size.
        Supports dot notation for nested fields.
        
        **Image Size Limiting:**
        - `images_size` - Limit the number of images returned in image lists.

        **Examples:**
        - `?fields=id,name,release_date` - Return only basic info
        - `?fields=id,name,images.url,tracks.name` - Include images and tracks
        - `?images_size=4` - Limit images to 4 per list
        ''',
        parameters=[
            OpenApiParameter('album_id', OpenApiTypes.STR, OpenApiParameter.PATH, required=True, description='Spotify album ID'),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include. Supports dot notation for nested fields (e.g., "id,name,images.url")'),
            OpenApiParameter('images_size', OpenApiTypes.INT, OpenApiParameter.QUERY, required=False, description='Maximum number of images to return in the images list (default: 18)')
        ],
        responses={
            200: AlbumDetailSerializer,
            404: ErrorResponseSerializer
        }
    )
    def get(self, request, album_id: str):
        client = self.get_client()
        mapper = self.get_mapper()
        images_size = int(request.query_params.get('images_size', 18))

        data, status_code = client.get_album(album_id=album_id)

        if status_code != http_status.HTTP_200_OK:
            if status_code == http_status.HTTP_404_NOT_FOUND:
                raise NotFoundException('Album')
            return Response(data, status=status_code)

        if not data:
            raise NotFoundException('Album')

        album = mapper.map_detail(data)
        album_dict = album.to_dict(images_size=images_size)
        album_dict = self.apply_dynamic_fields(album_dict, request)
        return Response(album_dict, status=http_status.HTTP_200_OK)
