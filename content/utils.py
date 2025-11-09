from typing import Optional, Dict, Any
from content.models import ContentItem
from rest_framework import status as http_status
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from proxy.views.movies.detail import MovieDetailView
from proxy.views.tv_shows.detail import TVShowDetailView
from proxy.views.tv_shows.season import TVSeasonDetailView
from proxy.views.games.detail import GameDetailView
from proxy.views.albums.detail import AlbumDetailView
from proxy.views.books.detail import BookDetailView


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
    try:
        if content_type == ContentItem.ContentType.MOVIE:
            return _fetch_tmdb_movie_data(external_id, country_code)

        elif content_type == ContentItem.ContentType.TV_SHOW:
            return _fetch_tmdb_tv_show_data(external_id, country_code)

        elif content_type == ContentItem.ContentType.SEASON:
            return _fetch_tmdb_season_data(external_id, country_code)

    except Exception:
        pass

    return None


def _fetch_tmdb_movie_data(external_id: str, country_code: Optional[str] = None) -> Optional[Dict[str, Any]]:
    try:
        view = MovieDetailView()
        factory = APIRequestFactory()
        factory_request = factory.get(f'/api/proxy/movies/{external_id}/', {'country': country_code} if country_code else {})
        request = Request(factory_request)

        response = view.get(request, movie_id=external_id)
        if response.status_code == http_status.HTTP_200_OK:
            return response.data
    except Exception:
        pass

    return None


def _fetch_tmdb_tv_show_data(external_id: str, country_code: Optional[str] = None) -> Optional[Dict[str, Any]]:
    try:
        view = TVShowDetailView()
        factory = APIRequestFactory()
        factory_request = factory.get(f'/api/proxy/tv-shows/{external_id}/', {'country': country_code} if country_code else {})
        request = Request(factory_request)

        response = view.get(request, tv_id=external_id)
        if response.status_code == http_status.HTTP_200_OK:
            return response.data
    except Exception:
        pass

    return None


def _fetch_tmdb_season_data(external_id: str, country_code: Optional[str] = None) -> Optional[Dict[str, Any]]:
    try:
        parts = external_id.split(':')
        if len(parts) == 2:
            tv_id = parts[0]
            season_number = parts[1]

            view = TVSeasonDetailView()
            factory = APIRequestFactory()
            factory_request = factory.get(f'/api/proxy/tv-shows/{tv_id}/seasons/{season_number}/', {'country': country_code} if country_code else {})
            request = Request(factory_request)

            response = view.get(request, tv_id=tv_id, season_number=season_number)
            if response.status_code == http_status.HTTP_200_OK:
                return response.data
    except Exception:
        pass

    return None


def _fetch_igdb_data(external_id: str) -> Optional[Dict[str, Any]]:
    try:
        view = GameDetailView()
        factory = APIRequestFactory()
        request = factory.get(f'/api/proxy/games/{external_id}/')

        response = view.get(request, game_id=external_id)
        if response.status_code == http_status.HTTP_200_OK:
            return response.data
    except Exception:
        pass

    return None


def _fetch_spotify_data(external_id: str) -> Optional[Dict[str, Any]]:
    try:
        view = AlbumDetailView()
        factory = APIRequestFactory()
        request = factory.get(f'/api/proxy/albums/{external_id}/')

        response = view.get(request, album_id=external_id)
        if response.status_code == http_status.HTTP_200_OK:
            return response.data
    except Exception:
        pass

    return None


def _fetch_openlibrary_data(external_id: str) -> Optional[Dict[str, Any]]:
    try:
        view = BookDetailView()
        factory = APIRequestFactory()
        request = factory.get(f'/api/proxy/books/{external_id}/')

        response = view.get(request, book_id=external_id)
        if response.status_code == http_status.HTTP_200_OK:
            return response.data
    except Exception:
        pass

    return None
