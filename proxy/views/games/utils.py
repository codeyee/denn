import re
from typing import Optional, Dict, Any, List
from datetime import datetime

def replace_size(url: Optional[str], desired_size: str) -> Optional[str]:
    if not url: return None
    size_match = re.search(r'/t_[^/]+/', url)

    if size_match:
        size = size_match.group(0)
        url = url.replace(size, f'/t_{desired_size}/')

    return url

def build_image_url(url: Optional[str]) -> Optional[str]:
    if not url: return None
    url = 'https:' + url
    desired_size = '720p'
    return replace_size(url, desired_size)

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

    cover_url = None
    if isinstance(item.get('cover'), dict):
        cover_url = item.get('cover', {}).get('url')
        cover_url = build_image_url(cover_url)

    return {
        'id': item.get('id'),
        'title': item.get('name'),
        'type': format_game_type(item.get('game_type')),
        'release_date': format_release_date(item.get('first_release_date')),
        'description': build_description(item.get('summary'), item.get('storyline')),
        'image_url': cover_url,
        'authors': extract_authors(item.get('involved_companies')),
        'platforms': extract_platforms(item.get('platforms')),
    }

def normalize_search_item(item: Dict[str, Any]) -> Dict[str, Any]:
    return normalize_item(item)
