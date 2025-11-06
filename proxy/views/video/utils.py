from typing import Optional, Dict, Any, List
from django.conf import settings

def build_image_url(path: Optional[str], size: str = 'w500') -> Optional[str]:
    if not path: return None
    base_url = settings.PROXY_API["TMDB"]["IMAGES_BASE_URL"]
    base_url = base_url.rsplit('/', 1)[0]
    return f'{base_url}/{size}{path}'

def build_still_url(path: Optional[str]) -> Optional[str]:
    return build_image_url(path, size='w500')

def normalize_providers(watch_providers_data: Optional[Dict[str, Any]], country_code: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
    if not watch_providers_data: return None

    results = watch_providers_data.get('results', {})
    if not results: return None

    # Track providers by ID to merge rent/buy
    providers_by_id: Dict[int, Dict[str, Any]] = {}

    # If country_code is provided, only process that country
    countries_to_process = {}
    if country_code:
        country_code_upper = country_code.upper()
        if country_code_upper in results:
            countries_to_process[country_code_upper] = results[country_code_upper]
    else:
        countries_to_process = results

    # Iterate through countries to process
    for country_code_key, country_data in countries_to_process.items():
        if not isinstance(country_data, dict): continue

        # Process flatrate providers (streaming)
        flatrate_providers = country_data.get('flatrate', [])

        for provider in flatrate_providers:
            provider_id = provider.get('provider_id')

            if provider_id:
                providers_by_id[provider_id] = {
                    'id': provider_id,
                    'name': provider.get('provider_name', ''),
                    'image_url': build_image_url(provider.get('logo_path')),
                    'type': 'streaming'
                }

        # Process rent providers
        rent_providers = country_data.get('rent', [])
        for provider in rent_providers:
            provider_id = provider.get('provider_id')
            if provider_id:
                if provider_id in providers_by_id:
                    # Already exists (from flatrate), skip or update type
                    # If it's streaming, keep it as streaming
                    if providers_by_id[provider_id]['type'] != 'streaming':
                        # If it was buy, make it rent_buy
                        providers_by_id[provider_id]['type'] = 'rent_buy'
                else:
                    providers_by_id[provider_id] = {
                        'id': provider_id,
                        'name': provider.get('provider_name', ''),
                        'image_url': build_image_url(provider.get('logo_path')),
                        'type': 'rent'
                    }

        # Process buy providers
        buy_providers = country_data.get('buy', [])
        for provider in buy_providers:
            provider_id = provider.get('provider_id')
            if provider_id:
                if provider_id in providers_by_id:
                    # Already exists
                    current_type = providers_by_id[provider_id]['type']
                    if current_type == 'streaming':
                        # Keep as streaming
                        pass
                    elif current_type == 'rent':
                        # Make it rent_buy
                        providers_by_id[provider_id]['type'] = 'rent_buy'
                    elif current_type == 'buy':
                        # Already buy, keep it
                        pass
                else:
                    providers_by_id[provider_id] = {
                        'id': provider_id,
                        'name': provider.get('provider_name', ''),
                        'image_url': build_image_url(provider.get('logo_path')),
                        'type': 'buy'
                    }

    # Convert to list and sort by id
    providers_list = list(providers_by_id.values())
    providers_list.sort(key=lambda x: x['id'])

    return providers_list if providers_list else None

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

def normalize_season(season: Dict[str, Any], tv_show_name: Optional[str] = None, tv_show_backdrop_path: Optional[str] = None) -> Dict[str, Any]:
    poster_path = season.get('poster_path')
    backdrop_path = tv_show_backdrop_path

    poster_w500 = build_image_url(poster_path)
    poster_original = build_image_url(poster_path, 'original')
    backdrop_w1280 = build_image_url(backdrop_path, 'w1280')
    backdrop_original = build_image_url(backdrop_path, 'original')

    result = {
        'id': season.get('id'),
        'season_number': season.get('season_number'),
        'title': season.get('name'),
        'description': season.get('overview') if season.get('overview') else None,
        'release_date': season.get('air_date'),
        'image_url': poster_w500,
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

    if tv_show_name:
        result['tv_show_name'] = tv_show_name

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
