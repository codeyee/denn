from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from proxy.serializers import BulkAlbumsResponseSerializer, ErrorResponseSerializer
from proxy.exceptions import MissingParameterError
from .base import SpotifyBaseView

class MusicBulkAlbumsView(SpotifyBaseView):
    @extend_schema(
        tags=['Proxy - Music'],
        summary='Bulk get album details',
        description='Retrieve detailed information about multiple albums from Spotify in a single request. Maximum 20 albums per request.',
        parameters=[
            OpenApiParameter(
                'ids',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=True,
                description='Comma-separated list of Spotify album IDs (e.g., "7ycBtnsMtyVbbwTfJwRjSP,1ATL5GLyefJaxhQzSPVrLX")'
            )
        ],
        responses={
            200: BulkAlbumsResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        ids_param = request.query_params.get('ids', '')
        if not ids_param:
            raise MissingParameterError('ids')

        album_ids = [id.strip() for id in ids_param.split(',') if id.strip()]

        if not album_ids:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'No valid album IDs provided'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        if len(album_ids) > 20:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'Maximum 20 album IDs allowed per request (Spotify API limitation)'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.get_bulk_albums(album_ids)

        if status_code != http_status.HTTP_200_OK:
            return Response(data, status=status_code)

        albums = data.get('albums', [])
        normalized_albums = []
        for album in albums:
            if album is not None:
                normalized_albums.append(mapper.map_detail(album).to_dict())
            else:
                normalized_albums.append(None)

        return Response({'albums': normalized_albums}, status=http_status.HTTP_200_OK)
