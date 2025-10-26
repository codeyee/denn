from typing import Optional, Dict, Any
from django.conf import settings

def build_image_url(path: Optional[str], size: str = 'w500') -> Optional[str]:
    if not path: return None
    base_url = settings.PROXY_API["TMDB"]["IMAGES_BASE_URL"]
    base_url = base_url.rsplit('/', 1)[0]
    return f'{base_url}/{size}{path}'

def build_poster_url(path: Optional[str]) -> Optional[str]:
    return build_image_url(path, size='w500')

def build_backdrop_url(path: Optional[str]) -> Optional[str]:
    return build_image_url(path, size='original')

def build_still_url(path: Optional[str]) -> Optional[str]:
    return build_image_url(path, size='w500')

def normalize_search_item(item: Dict[str, Any], media_type: Optional[str] = None) -> Dict[str, Any]:
    item_type = media_type or item.get('media_type')

    title = item.get('title') or item.get('name')
    original_title = item.get('original_title') or item.get('original_name')
    release_date = item.get('release_date') or item.get('first_air_date')

    return {
        'id': item.get('id'),
        'type': item_type,
        'title': title,
        'original_title': original_title,
        'original_language': item.get('original_language'),
        'description': item.get('overview'),
        'poster_url': build_poster_url(item.get('poster_path')),
        'backdrop_url': build_backdrop_url(item.get('backdrop_path')),
        'release_date': release_date,
    }

def normalize_movie(data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'id': data.get('id'),
        'imdb_id': data.get('imdb_id'),
        'title': data.get('title'),
        'original_title': data.get('original_title'),
        'original_language': data.get('original_language'),
        'description': data.get('overview'),
        'poster_url': build_poster_url(data.get('poster_path')),
        'backdrop_url': build_backdrop_url(data.get('backdrop_path')),
        'release_date': data.get('release_date'),
        'duration_minutes': data.get('runtime'),
        'status': data.get('status')
    }

def normalize_episode(episode: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'id': episode.get('id'),
        'episode_number': episode.get('episode_number'),
        'season_number': episode.get('season_number'),
        'episode_type': episode.get('episode_type'),
        'name': episode.get('name'),
        'description': episode.get('overview'),
        'release_date': episode.get('air_date'),
        'duration_minutes': episode.get('runtime'),
        'image_url': build_still_url(episode.get('still_path'))
    }

def normalize_season(season: Dict[str, Any]) -> Dict[str, Any]:
    result = {
        'id': season.get('id'),
        'season_number': season.get('season_number'),
        'name': season.get('name'),
        'description': season.get('overview'),
        'release_date': season.get('air_date'),
        'poster_url': build_poster_url(season.get('poster_path'))
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
    transformed_seasons = [normalize_season(season) for season in seasons]

    return {
        'id': data.get('id'),
        'title': data.get('name'),
        'original_title': data.get('original_name'),
        'original_language': data.get('original_language'),
        'description': data.get('overview'),
        'poster_url': build_poster_url(data.get('poster_path')),
        'backdrop_url': build_backdrop_url(data.get('backdrop_path')),
        'release_date': data.get('first_air_date'),
        'status': data.get('status'),
        'number_of_seasons': data.get('number_of_seasons'),
        'number_of_episodes': data.get('number_of_episodes'),
        'seasons': transformed_seasons
    }
