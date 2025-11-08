from rest_framework.response import Response
from rest_framework import status as http_status
from .base import SpotifyBaseView
from proxy.exceptions import MissingParameterError
from proxy.serializers import MusicSearchResponseSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class MusicSearchView(SpotifyBaseView):

    @extend_schema(
        tags=['Proxy - Music'],
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
            200: MusicSearchResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        query = request.query_params.get('query')
        if not query:
            raise MissingParameterError('query')

        limit = int(request.query_params.get('limit', 20))
        offset = int(request.query_params.get('offset', 0))

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
