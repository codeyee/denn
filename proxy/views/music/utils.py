from typing import Optional, Dict, Any, List

def get_image_url(images: Optional[List[Dict[str, Any]]], size: str = 'large') -> Optional[str]:
    if not images or len(images) == 0: return None

    if size == 'large' and len(images) > 0: return images[0].get('url')
    if size == 'medium' and len(images) > 1: return images[1].get('url')
    if size == 'small' and len(images) > 2: return images[2].get('url')

    return images[0].get('url')

def get_artist_names(artists: Optional[List[Dict[str, Any]]]) -> Optional[str]:
    if not artists or len(artists) == 0: return None
    return ', '.join([artist.get('name', '') for artist in artists])

def get_artist_ids(artists: Optional[List[Dict[str, Any]]]) -> Optional[List[str]]:
    if not artists or len(artists) == 0: return None
    return [artist.get('id') for artist in artists if artist.get('id')]

def normalize_album_search(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'id': item.get('id'),
        'type': 'album',
        'title': item.get('name'),
        'artist': get_artist_names(item.get('artists')),
        'image_url': get_image_url(item.get('images')),
        'release_date': item.get('release_date'),
        'total_tracks': item.get('total_tracks'),
        'album_type': item.get('album_type'),
        'external_url': item.get('external_urls', {}).get('spotify')
    }

def normalize_track_simple(track: Dict[str, Any]) -> Dict[str, Any]:
    duration_s = int(track.get('duration_ms') / 1000)

    return {
        'id': track.get('id'),
        'name': track.get('name'),
        'track_number': track.get('track_number'),
        'duration_s': duration_s,
        'external_url': track.get('external_urls', {}).get('spotify')
    }

def normalize_album(data: Dict[str, Any]) -> Dict[str, Any]:
    tracks = data.get('tracks', {}).get('items', [])
    normalized_tracks = [normalize_track_simple(track) for track in tracks]

    return {
        'id': data.get('id'),
        'title': data.get('name'),
        'artist': get_artist_names(data.get('artists')),
        'image_url': get_image_url(data.get('images'), 'large'),
        'release_date': data.get('release_date'),
        'total_tracks': data.get('total_tracks'),
        'album_type': data.get('album_type'),
        'external_url': data.get('external_urls', {}).get('spotify'),
        'tracks': normalized_tracks,
    }