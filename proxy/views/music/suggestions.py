from rest_framework.response import Response
from rest_framework import status as http_status, serializers
from .base import SpotifyBaseView
from proxy.serializers import AlbumDetailSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class MusicSuggestionsView(SpotifyBaseView):

    @extend_schema(
        tags=['Proxy - Music'],
        summary='Get music suggestions',
        description='''
        Get new release albums for homepage suggestions.

        This endpoint fetches recently released albums from Spotify,
        filtered to show only albums and EPs (excludes singles).

        Returns an object with 'results' (list of albums) and 'count' (number of results).
        ''',
        parameters=[
            OpenApiParameter(
                'limit',
                OpenApiTypes.INT,
                description='Number of suggestions to return (default: 20, max: 50)'
            )
        ],
        responses={
            200: {
                "type": "object",
                "properties": {
                    "results": {"type": "array", "items": {}},
                    "count": {"type": "integer"}
                }
            },
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        limit = int(request.query_params.get('limit', 20))
        limit = min(limit, 50)

        client = self.get_client()
        mapper = self.get_mapper()

        filtered_results = []
        seen_ids = set()
        offset = 0
        max_per_request = 50
        fetch_multiplier = 2

        while len(filtered_results) < limit:
            remaining = limit - len(filtered_results)
            request_limit = min(remaining * fetch_multiplier, max_per_request)

            data, status_code = client.get_new_releases(limit=request_limit, offset=offset)

            if status_code != http_status.HTTP_200_OK or 'albums' not in data:
                break

            albums = data['albums'].get('items', [])
            if not albums:
                break

            for album in albums:
                if not album or not album.get('id'):
                    continue

                album_id = album.get('id')
                if album_id in seen_ids:
                    continue

                album_type = (album.get('album_type') or '').lower()
                if album_type != 'single':
                    seen_ids.add(album_id)
                    search_item = mapper.map_search_item(album)
                    filtered_results.append(search_item.to_dict())

                    if len(filtered_results) >= limit:
                        break

            offset += len(albums)

            if len(albums) < request_limit:
                break

        return Response({'results': filtered_results, 'count': len(filtered_results)}, status=http_status.HTTP_200_OK)
