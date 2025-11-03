from typing import Optional, Dict, Any
from django.conf import settings

def build_image_url(path: Optional[str], size: str = 'w500') -> Optional[str]:
    if not path: return None
    base_url = settings.PROXY_API["TMDB"]["IMAGES_BASE_URL"]
    base_url = base_url.rsplit('/', 1)[0]
    return f'{base_url}/{size}{path}'

def build_still_url(path: Optional[str]) -> Optional[str]:
    return build_image_url(path, size='w500')

def normalize_search_item(item: Dict[str, Any], media_type: Optional[str] = None) -> Dict[str, Any]:
    item_type = media_type or item.get('media_type')

    title = item.get('title') or item.get('name') or None
    original_title = item.get('original_title') or item.get('original_name') or None
    release_date = item.get('release_date') or item.get('first_air_date') or None

    return {
        'id': item.get('id'),
        'type': item_type,
        'title': title,
        'original_title': original_title,
        'description': item.get('overview') if item.get('overview') else None,
        'image_url': build_image_url(item.get('poster_path')),
        'release_date': release_date,
    }

def normalize_movie(data: Dict[str, Any]) -> Dict[str, Any]:
    poster_path = data.get('poster_path')
    backdrop_path = data.get('backdrop_path')

    poster_w500 = build_image_url(poster_path, 'w500')
    poster_original = build_image_url(poster_path, 'original')
    backdrop_w1280 = build_image_url(backdrop_path, 'w1280')
    backdrop_original = build_image_url(backdrop_path, 'original')

    return {
        'id': data.get('id'),
        'imdb_id': data.get('imdb_id'),
        'title': data.get('title'),
        'original_title': data.get('original_title'),
        'description': data.get('overview') if data.get('overview') else None,
        'image_url': poster_w500,
        'tagline': data.get('tagline'),
        'release_date': data.get('release_date'),
        'duration_minutes': data.get('runtime'),
        'status': data.get('status'),
        'images': {
            'poster': {
                'standard': poster_w500,
                'original': poster_original,
            },
            'backdrop': {
                'standard': backdrop_w1280,
                'original': backdrop_original,
            }
        }
    }

def normalize_episode(episode: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'id': episode.get('id'),
        'episode_number': episode.get('episode_number'),
        'season_number': episode.get('season_number'),
        'episode_type': episode.get('episode_type'),
        'title': episode.get('name'),
        'description': episode.get('overview') if episode.get('overview') else None,
        'release_date': episode.get('air_date'),
        'duration_minutes': episode.get('runtime'),
        'image_url': build_still_url(episode.get('still_path'))
    }

def normalize_season(season: Dict[str, Any]) -> Dict[str, Any]:
    result = {
        'id': season.get('id'),
        'season_number': season.get('season_number'),
        'title': season.get('name'),
        'description': season.get('overview') if season.get('overview') else None,
        'release_date': season.get('air_date'),
        'image_url': build_image_url(season.get('poster_path'))
    }

    episodes = season.get('episodes', [])

    if episodes:
        result['episodes'] = [normalize_episode(ep) for ep in episodes]
        result['number_of_episodes'] = len(result['episodes'])

    else:
        result['number_of_episodes'] = season.get('episode_count', 0)

    return result

def normalize_tv(data: Dict[str, Any]) -> Dict[str, Any]:
    seasons = data.get('seasons', [])
    transformed_seasons = [normalize_season(season) for season in seasons] if seasons else []

    poster_path = data.get('poster_path')
    backdrop_path = data.get('backdrop_path')

    poster_w500 = build_image_url(poster_path)
    poster_original = build_image_url(poster_path, 'original')

    backdrop_w1280 = build_image_url(backdrop_path, 'w1280')
    backdrop_original = build_image_url(backdrop_path, 'original')

    return {
        'id': data.get('id'),
        'title': data.get('name'),
        'original_title': data.get('original_name'),
        'description': data.get('overview') if data.get('overview') else None,
        'image_url': poster_w500,
        'tagline': data.get('tagline'),
        'homepage': data.get('homepage'),
        'release_date': data.get('first_air_date'),
        'status': data.get('status'),
        'number_of_seasons': data.get('number_of_seasons'),
        'number_of_episodes': data.get('number_of_episodes'),
        'images': {
            'poster': {
                'standard': poster_w500,
                'original': poster_original,
            },
            'backdrop': {
                'standard': backdrop_w1280,
                'original': backdrop_original,
            }
        },
        'seasons': transformed_seasons
    }
