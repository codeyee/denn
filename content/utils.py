from typing import Optional, Dict, Any
from content.models import ContentItem
from proxy.views.book.utils import normalize_search_item
from proxy.mappers import TMDBMapper
from proxy.views.games.utils import normalize_item
from proxy.views.music.utils import normalize_album
from proxy.clients.tmdb import TMDBClient
from proxy.clients.igdb import IGDBClient
from proxy.clients.spotify import SpotifyClient
from proxy.clients.openlibrary import OpenLibraryClient
from rest_framework import status as http_status


def fetch_source_data(content_item: ContentItem, country_code: Optional[str] = None) -> Optional[Dict[str, Any]]:
    source_api = content_item.source_api
    external_id = content_item.external_id
    content_type = content_item.content_type

    try:
        if source_api == ContentItem.SourceAPI.TMDB:
            return _fetch_tmdb_data(external_id, content_type, country_code=country_code)

        elif source_api == ContentItem.SourceAPI.IGDB:
            return _fetch_igdb_data(external_id)

        elif source_api == ContentItem.SourceAPI.SPOTIFY:
            return _fetch_spotify_data(external_id)

        elif source_api == ContentItem.SourceAPI.OPENLIBRARY:
            return _fetch_openlibrary_data(external_id)
    except Exception:
        return None

    return None


def _fetch_tmdb_data(external_id: str, content_type: str, country_code: Optional[str] = None) -> Optional[Dict[str, Any]]:
    client = TMDBClient()
    mapper = TMDBMapper(client)

    try:
        if content_type == ContentItem.ContentType.MOVIE:
            movie_id_int = int(external_id)
            movie, status_code = mapper.get_movie_complete(
                movie_id_int, country_code)
            if status_code == http_status.HTTP_200_OK and movie:
                return movie.to_dict()

        elif content_type == ContentItem.ContentType.TV_SHOW:
            tv_id_int = int(external_id)
            tv_show, status_code = mapper.get_tv_show_complete(
                tv_id_int, country_code)
            if status_code == http_status.HTTP_200_OK and tv_show:
                return tv_show.to_dict()

        elif content_type == ContentItem.ContentType.SEASON:
            parts = external_id.split(':')
            if len(parts) == 2:
                tv_id = int(parts[0])
                season_number = int(parts[1])
                season, status_code = mapper.get_season_complete(
                    tv_id, season_number, country_code)
                if status_code == http_status.HTTP_200_OK and season:
                    return season.to_dict()

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
