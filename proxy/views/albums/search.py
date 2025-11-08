from rest_framework.response import Response
from rest_framework import status as http_status
from proxy.views.base import SpotifyBaseView
from proxy.exceptions import MissingParameterException, InvalidParameterException
from proxy.serializers.albums import AlbumSearchResponseSerializer
from proxy.serializers.common import ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class AlbumSearchView(SpotifyBaseView):

    def _validate_query(self, request):
        query = request.query_params.get('query')
        if not query:
            raise MissingParameterException('query is required')

        return query

    def _validate_limit(self, request):
        limit = int(request.query_params.get('limit', 20))
        if limit < 1 or limit > 50:
            raise InvalidParameterException('limit must be between 1 and 50')

        return limit

    def _validate_offset(self, request):
        offset = int(request.query_params.get('offset', 0))
        if offset < 0:
            raise InvalidParameterException('offset must be greater than or equal to 0')

        return offset

    @extend_schema(
        tags=['Proxy - Albums'],
        summary='Search music albums',
        description='''
        Search for music albums on Spotify.

        Results are filtered to show only albums and EPs (excludes singles).
        ''',
        parameters=[
            OpenApiParameter('query', OpenApiTypes.STR, required=True, description='Search query'),
            OpenApiParameter('limit', OpenApiTypes.INT, description='Results per page (1-50, default: 20)'),
            OpenApiParameter('offset', OpenApiTypes.INT, description='Offset for pagination (default: 0)')
        ],
        responses={
            200: AlbumSearchResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        query = self._validate_query(request)
        limit = self._validate_limit(request)
        offset = self._validate_offset(request)

        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.search(query=query, search_type='album', limit=limit, offset=offset)

        if status_code != http_status.HTTP_200_OK:
            return Response(data, status=status_code)

        albums_data = data.get('albums', {})
        albums = albums_data.get('items', [])

        filtered_albums = []
        for album in albums:
            album_type = (album.get('album_type') or '').lower()
            if album_type != 'single':
                search_item = mapper.map_search_item(album)
                filtered_albums.append(search_item.to_dict())

        total_results = albums_data.get('total', 0)
        current_page = (offset // limit) + 1 if limit > 0 else 1
        total_pages = (total_results // limit) + (1 if total_results % limit > 0 else 0) if limit > 0 else 1

        metadata = {
            'page': current_page,
            'page_results': len(filtered_albums),
            'total_pages': total_pages,
            'total_results': total_results
        }

        return Response({'metadata': metadata, 'results': filtered_albums}, status=http_status.HTTP_200_OK)
