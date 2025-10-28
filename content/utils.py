from typing import Optional, Dict, Any
from content.models import ContentItem
from proxy.views.book.utils import normalize_search_item
from proxy.views.video.utils import normalize_movie, normalize_tv
from proxy.views.games.utils import normalize_item
from proxy.views.music.utils import normalize_album
from proxy.clients.tmdb import TMDBClient
from proxy.clients.igdb import IGDBClient
from proxy.clients.spotify import SpotifyClient
from proxy.clients.openlibrary import OpenLibraryClient

def fetch_source_data(content_item: ContentItem) -> Optional[Dict[str, Any]]:
    source_api = content_item.source_api
    external_id = content_item.external_id
    content_type = content_item.content_type

    try:
        if source_api == ContentItem.SourceAPI.TMDB:
            return _fetch_tmdb_data(external_id, content_type)
        elif source_api == ContentItem.SourceAPI.IGDB:
            return _fetch_igdb_data(external_id)
        elif source_api == ContentItem.SourceAPI.SPOTIFY:
            return _fetch_spotify_data(external_id)
        elif source_api == ContentItem.SourceAPI.OPENLIBRARY:
            return _fetch_openlibrary_data(external_id)
    except Exception:
        return None

    return None

def _fetch_tmdb_data(external_id: str, content_type: str) -> Optional[Dict[str, Any]]:
    client = TMDBClient()

    try:
        if content_type == ContentItem.ContentType.MOVIE:
            data, status_code = client.get_movie_details(int(external_id))
            if status_code == 200:
                return normalize_movie(data)
        elif content_type == ContentItem.ContentType.TV_SHOW:
            data, status_code = client.get_tv_details(int(external_id))
            if status_code == 200:
                return normalize_tv(data)
    except Exception:
        pass

    return None

def _fetch_igdb_data(external_id: str) -> Optional[Dict[str, Any]]:
    client = IGDBClient()

    try:
        data, status_code = client.get_bulk_games([int(external_id)])
        if status_code == 200 and isinstance(data, list) and len(data) > 0:
            return normalize_item(data[0])
    except Exception:
        pass

    return None


def _fetch_spotify_data(external_id: str) -> Optional[Dict[str, Any]]:
    client = SpotifyClient()

    try:
        data, status_code = client.get_album(external_id)
        if status_code == 200:
            return normalize_album(data)
    except Exception:
        pass

    return None

def _fetch_openlibrary_data(external_id: str) -> Optional[Dict[str, Any]]:
    client = OpenLibraryClient()

    try:
        data, status_code = client.search_by_key(external_id)
        if status_code == 200 and 'docs' in data and len(data['docs']) > 0:
            return normalize_search_item(data['docs'][0])
    except Exception:
        pass

    return None
