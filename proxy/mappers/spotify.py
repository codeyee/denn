from typing import Dict, Any, Optional, List
from proxy.models.album import Album, Track
from proxy.models.base import SearchItem, Images, Author
from proxy.clients.spotify import SpotifyClient
from proxy.constants import ContentType, AuthorType, AlbumType


class SpotifyMapper:
    def __init__(self, client: SpotifyClient):
        self.client = client

    def _get_image_url(self, images: Optional[List[Dict[str, Any]]], size: str = 'large') -> Optional[str]:
        if not images or len(images) == 0:
            return None

        if size == 'large' and len(images) > 0:
            return images[0].get('url')
        if size == 'medium' and len(images) > 1:
            return images[1].get('url')
        if size == 'small' and len(images) > 2:
            return images[2].get('url')

        return images[0].get('url')

    def _get_artist_names(self, artists: Optional[List[Dict[str, Any]]]) -> Optional[List[Author]]:
        if not artists or len(artists) == 0:
            return None
        authors = []
        for artist in artists:
            name = artist.get('name')
            if name:
                authors.append(Author(
                    name=name,
                    type=AuthorType.PERSON
                ))
        return authors if authors else None

    def _normalize_release_date(self, date_str: Optional[str]) -> Optional[str]:
        if not date_str:
            return None

        if len(date_str) == 10:
            return date_str
        elif len(date_str) == 7:
            return f"{date_str}-01"
        elif len(date_str) == 4:
            return f"{date_str}-01-01"

        return None

    def _build_images(self, images_data: Optional[List[Dict[str, Any]]]) -> Optional[Images]:
        if not images_data or len(images_data) == 0:
            return None

        poster_standard = self._get_image_url(images_data, 'medium')
        poster_original = self._get_image_url(images_data, 'large')

        if not poster_standard and not poster_original:
            return None

        return Images(
            poster_standard=poster_standard,
            poster_original=poster_original
        )

    def _derive_album_type(
        self,
        spotify_album_type: Optional[str],
        total_tracks: int,
        total_duration_minutes: Optional[int]
    ) -> str:
        if total_duration_minutes is not None and total_duration_minutes >= 30:
            return AlbumType.ALBUM

        if total_tracks >= 7:
            return AlbumType.ALBUM

        if 4 <= total_tracks <= 6 and (total_duration_minutes is None or total_duration_minutes < 30):
            return AlbumType.EP

        return AlbumType.SINGLE

    def _to_minutes(self, total_seconds: int) -> Optional[int]:
        if not total_seconds:
            return None
        return round(total_seconds / 60)

    def map_track(self, track: Dict[str, Any]) -> Track:
        duration_ms = track.get('duration_ms', 0)
        duration_seconds = round(duration_ms / 1000) if duration_ms else None

        return Track(
            id=track.get('id'),
            title=track.get('name', ''),
            authors=self._get_artist_names(track.get('artists')),
            track_number=track.get('track_number'),
            duration_seconds=duration_seconds,
            external_url=track.get('external_urls', {}).get('spotify')
        )

    def map_search_item(self, item: Dict[str, Any], content_type: Optional[str] = None) -> SearchItem:
        return SearchItem(
            id=item.get('id'),
            type=ContentType.ALBUM,
            title=item.get('name', ''),
            original_title=item.get('name', ''),
            authors=self._get_artist_names(item.get('artists')),
            image_url=self._get_image_url(item.get('images'), 'large'),
            release_date=self._normalize_release_date(item.get('release_date'))
        )

    def map_detail(self, data: Dict[str, Any]) -> Album:
        tracks_data = data.get('tracks', {}).get('items', [])
        tracks = [self.map_track(track) for track in tracks_data]

        total_duration_seconds = sum((track.duration_seconds or 0) for track in tracks)
        duration_minutes = self._to_minutes(total_duration_seconds)

        spotify_album_type = (data.get('album_type') or '').lower()
        total_tracks = data.get('total_tracks', 0)
        derived_album_type = self._derive_album_type(spotify_album_type, total_tracks, duration_minutes)

        images = self._build_images(data.get('images'))

        return Album(
            id=data.get('id'),
            title=data.get('name', ''),
            content_type=ContentType.ALBUM,
            authors=self._get_artist_names(data.get('artists')),
            image_url=self._get_image_url(data.get('images'), 'large'),
            release_date=self._normalize_release_date(data.get('release_date')),
            total_tracks=total_tracks,
            duration_minutes=duration_minutes,
            album_type=derived_album_type,
            external_url=data.get('external_urls', {}).get('spotify'),
            images=images,
            tracks=tracks
        )
