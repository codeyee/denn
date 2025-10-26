from .base import SpotifyBaseView
from .utils import normalize_album_search
from proxy.errors import build_error_response, get_http_status, MISSING_QUERY
from typing import Dict, Any

class MusicSearchView(SpotifyBaseView):
    MIN_TRACKS = 4

    def filter_albums(self, data: Dict[str, Any]) -> Dict[str, Any]:
        albums_data = data.get('albums', {})
        albums = albums_data.get('items', [])

        min_tracks_threshold = getattr(
            self, 'current_min_tracks', self.MIN_TRACKS)

        filtered_albums = []
        for album in albums:
            album_type = album.get('album_type', '').lower()
            total_tracks = album.get('total_tracks', 0)

            if total_tracks < min_tracks_threshold:
                continue

            if album_type == 'album':
                filtered_albums.append(normalize_album_search(album))
            elif album_type == 'single' and total_tracks >= 4:
                album['album_type'] = 'ep'
                filtered_albums.append(normalize_album_search(album))

        metadata = {
            'total': albums_data.get('total', 0),
            'limit': albums_data.get('limit', 0),
            'offset': albums_data.get('offset', 0),
            'results_count': len(filtered_albums)
        }

        return {'metadata': metadata, 'albums': filtered_albums}

    def get(self, request):
        query = request.query_params.get('query')

        if not query:
            error_response = build_error_response(MISSING_QUERY)
            return self.transform_response(error_response, get_http_status(MISSING_QUERY))

        limit = int(request.query_params.get('limit', 20))
        offset = int(request.query_params.get('offset', 0))
        min_tracks = int(request.query_params.get('min_tracks', self.MIN_TRACKS))

        self.current_min_tracks = min_tracks

        client = self.get_client()
        return self.handle_api_call(
            client.search,
            transformer=self.filter_albums,
            query=query,
            search_type='album',
            limit=limit,
            offset=offset
        )
