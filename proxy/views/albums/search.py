from rest_framework.response import Response
from rest_framework import status as http_status
from proxy.views.base import SpotifyBaseView
from core.exceptions import MissingParameterException, InvalidParameterException
from proxy.serializers.albums import AlbumSearchResponseSerializer
from proxy.serializers.common import ErrorResponseSerializer
from core.pagination import build_pagination_metadata
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class AlbumSearchView(SpotifyBaseView):

    def _validate_query(self, request):
        query = request.query_params.get('query')
        if not query:
            raise MissingParameterException('query is required')

        return query

    def _validate_page_size(self, request):
        page_size = int(request.query_params.get('page_size', 20))
        if page_size < 1 or page_size > 50:
            raise InvalidParameterException('page_size must be between 1 and 50')

        return page_size

    def _validate_page(self, request):
        page = int(request.query_params.get('page', 1))
        if page < 1:
            raise InvalidParameterException('page must be greater than or equal to 1')

        return page

    @extend_schema(
        tags=['Proxy - Albums'],
        summary='Search music albums',
        description='''
        Search for music albums on Spotify.

        Results are filtered to show only albums and EPs (excludes singles).

        **Dynamic Field Selection:**
        Use the `fields` parameter to select specific fields and reduce response payload size.
        Supports dot notation for nested fields.

        **Examples:**
        - `?fields=id,name,release_date` - Return only basic info
        - `?fields=id,name,cover.url` - Include nested cover URL
        - `?fields=id,name,artists.name` - Get all artist names from artists array
        ''',
        parameters=[
            OpenApiParameter('query', OpenApiTypes.STR, required=True, description='Search query'),
            OpenApiParameter('page_size', OpenApiTypes.INT, description='Results per page (1-50, default: 20)'),
            OpenApiParameter('page', OpenApiTypes.INT, description='Page number (default: 1)'),
            OpenApiParameter('fields', OpenApiTypes.STR, required=False, description='Comma-separated list of fields to include. Supports dot notation for nested fields (e.g., "id,name,cover.url")')
        ],
        responses={
            200: AlbumSearchResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        query = self._validate_query(request)
        page = self._validate_page(request)
        page_size = self._validate_page_size(request)

        # Calculate offset for Spotify API (uses offset-based pagination internally)
        offset = (page - 1) * page_size

        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.search(query=query, search_type='album', limit=page_size, offset=offset)

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

        # Apply dynamic fields to the results list
        filtered_albums = self.apply_dynamic_fields(filtered_albums, request)

        metadata = build_pagination_metadata(
            request=request,
            current_page=page,
            page_size=page_size,
            total_results=albums_data.get('total', 0),
            results_count=len(filtered_albums)
        )

        return Response({'metadata': metadata, 'results': filtered_albums}, status=http_status.HTTP_200_OK)
