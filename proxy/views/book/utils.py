from typing import Optional, Dict, Any, List
from django.conf import settings
from dateutil import parser
from datetime import datetime

def build_image_url(image_id: Optional[int], size: str = 'L') -> Optional[str]:
    if not image_id: return None
    base_url = settings.PROXY_API['OPENLIBRARY']['COVERS_BASE_URL']
    return f'{base_url}/b/id/{image_id}-{size}.jpg'

def extract_id_from_key(key: Optional[str]) -> Optional[str]:
    if not key: return None
    return key.split('/')[-1] if '/' in key else key

def parse_publish_date(publish_dates: Optional[List[str]], first_publish_year: Optional[int]) -> Optional[str]:
    if publish_dates and isinstance(publish_dates, list):
        for date_str in publish_dates:
            try:
                parsed_date = parser.parse(date_str, fuzzy=True)
                return parsed_date.strftime('%Y-%m-%d')
            except (ValueError, TypeError, parser.ParserError):
                continue

    if first_publish_year: return str(first_publish_year)
    return None

def extract_description(item: Dict[str, Any]) -> Optional[str]:
    first_sentence = item.get('first_sentence', [None])
    if first_sentence: return first_sentence[0]
    return "No description available"

def normalize_search_item(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'id': extract_id_from_key(item.get('key')),
        'name': item.get('title'),
        'authors': item.get('author_name', []),
        'image_url': build_image_url(item.get('cover_i')),
        'release_date': parse_publish_date(item.get('publish_date'), item.get('first_publish_year')),
        'pages': item.get('number_of_pages_median'),
        'description': extract_description(item),
    }
