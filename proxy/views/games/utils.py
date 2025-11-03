import re
from typing import Optional, Dict, Any, List
from datetime import datetime

IGDB_IMAGE_BASE_URL = 'https://images.igdb.com/igdb/image/upload'

def extract_image_id(url: Optional[str]) -> Optional[str]:
    if not url: return None
    match = re.search(r'/([^/]+)\.jpg$', url)
    if match: return match.group(1)
    return None

def build_igdb_image_url(image_id: Optional[str], size: str) -> Optional[str]:
    if not image_id: return None
    return f'{IGDB_IMAGE_BASE_URL}/t_{size}/{image_id}.jpg'

def build_poster_variants(cover_data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Optional[str]]]:
    if not cover_data: return None

    image_id = cover_data.get('image_id')
    if not image_id:
        url = cover_data.get('url')
        image_id = extract_image_id(url)

    if not image_id: return None

    return {
        'standard': build_igdb_image_url(image_id, '720p'),
        'original': build_igdb_image_url(image_id, '1080p')
    }

def build_screenshot_artwork_variants(item_data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Optional[str]]]:
    if not item_data: return None

    image_id = item_data.get('image_id')
    if not image_id:
        url = item_data.get('url')
        image_id = extract_image_id(url)

    if not image_id: return None

    return {
        'standard': build_igdb_image_url(image_id, 'screenshot_huge'),
        'original': build_igdb_image_url(image_id, '1080p')
    }

def format_release_date(timestamp: Optional[int]) -> Optional[str]:
    if not timestamp: return None

    try:
        return datetime.utcfromtimestamp(timestamp).strftime('%Y-%m-%d')
    except (ValueError, OSError):
        return None

def extract_platforms(platforms: Optional[List[Dict[str, Any]]]) -> Optional[List[str]]:
    if not platforms: return None
    names = [platform.get('name') for platform in platforms if platform.get('name')]
    return names if names else None

def extract_authors(involved_companies: Optional[List[Dict[str, Any]]]) -> Optional[List[str]]:
    if not involved_companies: return None

    authors = []
    for company in involved_companies:
        if company.get('developer') and company.get('company', {}).get('name'):
            authors.append(company['company']['name'])

    return authors if authors else None

def format_game_type(game_type: Optional[int]) -> Optional[str]:
    game_type_map = {
        0: "Main game",
        8: "Remake",
    }

    return game_type_map.get(game_type, "Unknown")

def build_description(summary: Optional[str], storyline: Optional[str]) -> Optional[str]:
    if not summary and not storyline: return None
    if summary and storyline: return summary + '\n\n' + storyline
    return summary if summary else storyline

def normalize_item(item: Dict[str, Any]) -> Dict[str, Any]:
    if isinstance(item, list) and len(item) > 0:
        item = item[0]

    cover_data = item.get('cover') if isinstance(item.get('cover'), dict) else None
    poster_variants = build_poster_variants(cover_data)
    cover_standard = poster_variants.get('standard') if poster_variants else None
    cover_original = poster_variants.get('original') if poster_variants else None

    screenshots_list = []
    if isinstance(item.get('screenshots'), list):
        for shot in item.get('screenshots'):
            if isinstance(shot, dict):
                variants = build_screenshot_artwork_variants(shot)
                if variants:
                    screenshots_list.append(variants)

    artworks_list = []
    if isinstance(item.get('artworks'), list):
        for art in item.get('artworks'):
            if isinstance(art, dict):
                variants = build_screenshot_artwork_variants(art)
                if variants:
                    artworks_list.append(variants)

    return {
        'id': item.get('id'),
        'title': item.get('name'),
        'type': format_game_type(item.get('game_type')),
        'release_date': format_release_date(item.get('first_release_date')),
        'description': build_description(item.get('summary'), item.get('storyline')),
        'image_url': cover_standard,
        'authors': extract_authors(item.get('involved_companies')),
        'platforms': extract_platforms(item.get('platforms')),
        'slug': item.get('slug'),
        'images': {
            'poster': {
                'standard': cover_standard,
                'original': cover_original,
            } if poster_variants else None,
            'screenshots': screenshots_list if screenshots_list else None,
            'artworks': artworks_list if artworks_list else None,
        }
    }

def normalize_search_item(item: Dict[str, Any]) -> Dict[str, Any]:
    return normalize_item(item)
