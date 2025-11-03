from typing import Optional, Dict, Any, List

def get_image_url(images: Optional[List[Dict[str, Any]]], size: str = 'large') -> Optional[str]:
    if not images or len(images) == 0: return None

    if size == 'large' and len(images) > 0: return images[0].get('url')
    if size == 'medium' and len(images) > 1: return images[1].get('url')
    if size == 'small' and len(images) > 2: return images[2].get('url')

    return images[0].get('url')

def get_artist_names_array(artists: Optional[List[Dict[str, Any]]]) -> Optional[List[str]]:
    if not artists or len(artists) == 0: return None
    names = [artist.get('name', '') for artist in artists if artist.get('name')]
    return names if names else None

def get_artist_ids(artists: Optional[List[Dict[str, Any]]]) -> Optional[List[str]]:
    if not artists or len(artists) == 0: return None
    return [artist.get('id') for artist in artists if artist.get('id')]

def normalize_release_date(date_str: Optional[str]) -> Optional[str]:
    if not date_str: return None

    # YYYY-MM-DD
    if len(date_str) == 10: return date_str
    # YYYY-MM
    elif len(date_str) == 7: return f"{date_str}-01"
    # YYYY
    elif len(date_str) == 4: return f"{date_str}-01-01"

    return None

def should_include_album(album: Dict[str, Any]) -> bool:
    album_type = (album.get('album_type') or '').lower()
    return album_type != 'single'

def normalize_album_search(item: Dict[str, Any]) -> Dict[str, Any]:
    album_type = item.get('album_type', '').lower()
    total_tracks = item.get('total_tracks', 0)

    normalized_item = item.copy() if isinstance(item, dict) else item

    if album_type == 'single' and total_tracks >= 4:
        normalized_item['album_type'] = 'ep'

    return {
        'id': normalized_item.get('id'),
        'type': 'album',
        'title': normalized_item.get('name'),
        'authors': get_artist_names_array(normalized_item.get('artists')),
        'image_url': get_image_url(normalized_item.get('images'), 'large'),
        'release_date': normalize_release_date(normalized_item.get('release_date')),
        'total_tracks': normalized_item.get('total_tracks'),
        'album_type': normalized_item.get('album_type'),
        'external_url': normalized_item.get('external_urls', {}).get('spotify')
    }

def normalize_track_simple(track: Dict[str, Any]) -> Dict[str, Any]:
    duration_ms = track.get('duration_ms', 0)
    duration_seconds = round(duration_ms / 1000) if duration_ms else None

    return {
        'id': track.get('id'),
        'title': track.get('name'),
        'authors': get_artist_names_array(track.get('artists')),
        'track_number': track.get('track_number'),
        'duration_seconds': duration_seconds,
        'external_url': track.get('external_urls', {}).get('spotify')
    }

def calculate_total_duration_seconds(tracks: List[Dict[str, Any]]) -> int:
    if not tracks: return 0
    return sum((track.get('duration_seconds') or 0) for track in tracks)

def to_minutes(total_seconds: int) -> Optional[int]:
    if not total_seconds: return None
    return round(total_seconds / 60)

def derive_album_type(
    spotify_album_type: Optional[str],
    total_tracks: int,
    total_duration_minutes: Optional[int]
) -> str:
    if total_duration_minutes is not None and total_duration_minutes >= 30:
        return 'album'

    if total_tracks >= 7:
        return 'album'

    if 4 <= total_tracks <= 6 and (total_duration_minutes is None or total_duration_minutes < 30):
        return 'ep'

    return 'single'

def normalize_album(data: Dict[str, Any]) -> Dict[str, Any]:
    tracks = data.get('tracks', {}).get('items', [])
    normalized_tracks = [normalize_track_simple(track) for track in tracks]

    total_duration_seconds = calculate_total_duration_seconds(normalized_tracks)
    duration_minutes = to_minutes(total_duration_seconds)

    spotify_album_type = (data.get('album_type') or '').lower()
    total_tracks = data.get('total_tracks', 0)
    derived_album_type = derive_album_type(spotify_album_type, total_tracks, duration_minutes)

    return {
        'id': data.get('id'),
        'title': data.get('name'),
        'authors': get_artist_names_array(data.get('artists')),
        'image_url': get_image_url(data.get('images'), 'large'),
        'release_date': normalize_release_date(data.get('release_date')),
        'total_tracks': data.get('total_tracks'),
        'album_type': derived_album_type or data.get('album_type'),
        'external_url': data.get('external_urls', {}).get('spotify'),
        'tracks': normalized_tracks,
        'duration_minutes': duration_minutes,
    }
