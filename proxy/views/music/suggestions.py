from .base import SpotifyBaseView
from .utils import normalize_album_search, should_include_album
from proxy.serializers import MusicSuggestionsResponseSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from typing import Dict, Any, List, Tuple

class MusicSuggestionsView(SpotifyBaseView):

    def fetch_and_filter_new_releases(
        self, client, target_limit: int
    ) -> Tuple[List[Dict[str, Any]], int]:
        filtered_results = []
        seen_ids = set()
        offset = 0
        max_per_request = 50
        fetch_multiplier = 2

        while len(filtered_results) < target_limit:
            remaining = target_limit - len(filtered_results)
            request_limit = min(remaining * fetch_multiplier, max_per_request)

            data, status_code = client.get_new_releases(limit=request_limit, offset=offset)

            if status_code != 200 or 'albums' not in data:
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

                if should_include_album(album):
                    seen_ids.add(album_id)
                    normalized = normalize_album_search(album)
                    filtered_results.append(normalized)

                    if len(filtered_results) >= target_limit:
                        break

            offset += len(albums)

            if len(albums) < request_limit:
                break

        return filtered_results, status_code

    def transform_results(self, data):
        if 'albums' not in data:
            return {'results': [], 'count': 0}

        albums = data['albums'].get('items', [])
        filtered_results = []

        for album in albums:
            if not album:
                continue

            if should_include_album(album):
                normalized = normalize_album_search(album)
                filtered_results.append(normalized)

        return {
            'results': filtered_results,
            'count': len(filtered_results)
        }

    @extend_schema(
        tags=['Proxy - Music'],
        summary='Get music suggestions',
        description='''
        Get new release albums for homepage suggestions.

        This endpoint fetches recently released albums from Spotify,
        filtered to show only albums and EPs (excludes singles).
        ''',
        parameters=[
            OpenApiParameter(
                'limit',
                OpenApiTypes.INT,
                description='Number of suggestions to return (default: 20, max: 50)'
            )
        ],
        responses={
            200: MusicSuggestionsResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        limit = int(request.query_params.get('limit', 20))
        limit = min(limit, 50)

        client = self.get_client()

        # Fetch and filter with automatic pagination
        filtered_results, status_code = self.fetch_and_filter_new_releases(client, limit)

        return self.transform_response(
            {'results': filtered_results, 'count': len(filtered_results)},
            status_code
        )
