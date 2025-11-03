from .base import SpotifyBaseView
from .utils import normalize_album_search, should_include_album
from proxy.errors import build_error_response, get_http_status, MISSING_QUERY
from proxy.serializers import MusicSearchResponseSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from typing import Dict, Any

class MusicSearchView(SpotifyBaseView):

    def filter_albums(self, data: Dict[str, Any]) -> Dict[str, Any]:
        albums_data = data.get('albums', {})
        albums = albums_data.get('items', [])

        filtered_albums = []
        for album in albums:
            if should_include_album(album):
                filtered_albums.append(normalize_album_search(album))

        total_results = albums_data.get('total', 0)
        limit = albums_data.get('limit', 20)
        offset = albums_data.get('offset', 0)

        current_page = (offset // limit) + 1 if limit > 0 else 1
        total_pages = (total_results // limit) + (1 if total_results % limit > 0 else 0) if limit > 0 else 1

        metadata = {
            'page': current_page,
            'page_results': len(filtered_albums),
            'total_pages': total_pages,
            'total_results': total_results
        }

        return {'metadata': metadata, 'results': filtered_albums}

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
            error_response = build_error_response(MISSING_QUERY)
            return self.transform_response(error_response, get_http_status(MISSING_QUERY))

        limit = int(request.query_params.get('limit', 20))
        offset = int(request.query_params.get('offset', 0))

        client = self.get_client()
        return self.handle_api_call(
            client.search,
            transformer=self.filter_albums,
            query=query,
            search_type='album',
            limit=limit,
            offset=offset
        )
