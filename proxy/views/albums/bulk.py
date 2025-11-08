from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from proxy.serializers.albums import AlbumDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from proxy.exceptions import MissingParameterException, InvalidParameterException
from ..base import SpotifyBaseView

class AlbumBulkView(SpotifyBaseView):

    def _validate_ids(self, request):
        ids_param = request.query_params.get('ids', '')
        if not ids_param:
            raise MissingParameterException('ids')

        return ids_param
    
    def _validate_album_ids(self, ids_param):
        album_ids = [id.strip() for id in ids_param.split(',') if id.strip()]

        if not album_ids:
            raise InvalidParameterException('No valid album IDs provided')

        return album_ids

    def _validate_max_ids(self, album_ids):
        if len(album_ids) > 20:
            raise InvalidParameterException('Maximum 20 album IDs allowed per request')

        return album_ids

    @extend_schema(
        tags=['Proxy - Albums'],
        summary='Bulk get album details',
        description='Retrieve detailed information about multiple albums from Spotify in a single request. Maximum 20 albums per request. Returns a list of album details.',
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
            200: AlbumDetailSerializer(many=True),
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        ids_param = self._validate_ids(request)
        album_ids = self._validate_album_ids(ids_param)
        album_ids = self._validate_max_ids(album_ids)

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

        return Response(normalized_albums, status=http_status.HTTP_200_OK)
