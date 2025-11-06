from typing import Optional, Dict, Any
from content.models import ContentItem
from proxy.views.book.utils import normalize_search_item
from proxy.views.video.utils import normalize_movie, normalize_tv, normalize_season, normalize_providers
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

    try:
        if content_type == ContentItem.ContentType.MOVIE:
            movie_id_int = int(external_id)
            data, status_code = client.get_movie_details(movie_id_int)
            if status_code == http_status.HTTP_200_OK:
                normalized_data = normalize_movie(data)
                
                # Fetch external IDs and watch providers
                external_ids_data, external_ids_status = client.get_movie_external_ids(movie_id_int)
                watch_providers_data, watch_providers_status = client.get_movie_watch_providers(movie_id_int)
                
                # Add external IDs
                if external_ids_status == http_status.HTTP_200_OK and external_ids_data:
                    normalized_data['external_ids'] = external_ids_data
                    if external_ids_data.get('imdb_id'):
                        normalized_data['imdb_id'] = external_ids_data.get('imdb_id')
                
                # Add providers (normalized watch providers, filtered by country if provided)
                if watch_providers_status == http_status.HTTP_200_OK and watch_providers_data:
                    providers_result = normalize_providers(watch_providers_data, country_code=country_code)
                    # If country_code is provided and result is a list, wrap it in a dict with country code as key
                    if country_code and isinstance(providers_result, list):
                        normalized_data['providers'] = {country_code.upper(): providers_result}
                    else:
                        normalized_data['providers'] = providers_result
                
                return normalized_data

        elif content_type == ContentItem.ContentType.TV_SHOW:
            tv_id_int = int(external_id)
            data, status_code = client.get_tv_details(tv_id_int)
            if status_code == http_status.HTTP_200_OK:
                normalized_data = normalize_tv(data)
                
                # Fetch external IDs and watch providers
                external_ids_data, external_ids_status = client.get_tv_external_ids(tv_id_int)
                watch_providers_data, watch_providers_status = client.get_tv_watch_providers(tv_id_int)
                
                # Add external IDs
                if external_ids_status == http_status.HTTP_200_OK and external_ids_data:
                    normalized_data['external_ids'] = external_ids_data
                    if external_ids_data.get('imdb_id'):
                        normalized_data['imdb_id'] = external_ids_data.get('imdb_id')
                
                # Add providers (normalized watch providers, filtered by country if provided)
                if watch_providers_status == http_status.HTTP_200_OK and watch_providers_data:
                    providers_result = normalize_providers(watch_providers_data, country_code=country_code)
                    # If country_code is provided and result is a list, wrap it in a dict with country code as key
                    if country_code and isinstance(providers_result, list):
                        normalized_data['providers'] = {country_code.upper(): providers_result}
                    else:
                        normalized_data['providers'] = providers_result
                
                return normalized_data

        elif content_type == ContentItem.ContentType.SEASON:
            parts = external_id.split(':')

            if len(parts) == 2:
                tv_id = int(parts[0])
                season_number = int(parts[1])
                data, status_code = client.get_season_details(tv_id, season_number)

                if status_code == http_status.HTTP_200_OK:
                    tv_data, tv_status = client.get_tv_details(tv_id)
                    tv_show_name = None
                    tv_show_backdrop_path = None

                    if tv_status == http_status.HTTP_200_OK:
                        tv_show_name = tv_data.get('name')
                        tv_show_backdrop_path = tv_data.get('backdrop_path')

                    normalized_data = normalize_season(
                        data,
                        tv_show_name=tv_show_name,
                        tv_show_backdrop_path=tv_show_backdrop_path
                    )
                    
                    # Fetch external IDs and watch providers for season
                    external_ids_data, external_ids_status = client.get_season_external_ids(tv_id, season_number)
                    watch_providers_data, watch_providers_status = client.get_season_watch_providers(tv_id, season_number)
                    
                    # Add external IDs
                    if external_ids_status == http_status.HTTP_200_OK and external_ids_data:
                        normalized_data['external_ids'] = external_ids_data
                        if external_ids_data.get('imdb_id'):
                            normalized_data['imdb_id'] = external_ids_data.get('imdb_id')
                    
                    # Add providers (normalized watch providers, filtered by country if provided)
                    if watch_providers_status == http_status.HTTP_200_OK and watch_providers_data:
                        providers_result = normalize_providers(watch_providers_data, country_code=country_code)
                        # If country_code is provided and result is a list, wrap it in a dict with country code as key
                        if country_code and isinstance(providers_result, list):
                            normalized_data['providers'] = {country_code.upper(): providers_result}
                        else:
                            normalized_data['providers'] = providers_result
                    
                    return normalized_data

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
