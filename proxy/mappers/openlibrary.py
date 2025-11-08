from typing import Dict, Any, Optional, List
from django.conf import settings
from dateutil import parser
from proxy.models.book import Book
from proxy.models.base import SearchItem, Images
from proxy.clients.openlibrary import OpenLibraryClient
from proxy.constants import SearchItemType


class OpenLibraryMapper:
    def __init__(self, client: OpenLibraryClient):
        self.client = client

    def _build_cover_url(self, image_id: Optional[int], size: str = 'M') -> Optional[str]:
        if not image_id:
            return None
        base_url = settings.PROXY_API['OPENLIBRARY']['COVERS_BASE_URL']
        return f'{base_url}/b/id/{image_id}-{size}.jpg'

    def _build_images(self, image_id: Optional[int]) -> Optional[Images]:
        if not image_id:
            return None

        poster_standard = self._build_cover_url(image_id, 'M')
        poster_original = self._build_cover_url(image_id, 'L')

        if not poster_standard and not poster_original:
            return None

        return Images(
            poster_standard=poster_standard,
            poster_original=poster_original
        )

    def _extract_id_from_key(self, key: Optional[str]) -> Optional[str]:
        if not key:
            return None
        return key.split('/')[-1] if '/' in key else key

    def _parse_publish_date(self, publish_dates: Optional[List[str]], first_publish_year: Optional[int]) -> Optional[str]:
        if publish_dates and isinstance(publish_dates, list):
            for date_str in publish_dates:
                try:
                    parsed_date = parser.parse(date_str, fuzzy=True)
                    return parsed_date.strftime('%Y-%m-%d')
                except (ValueError, TypeError, parser.ParserError):
                    continue

        if first_publish_year:
            return str(first_publish_year)
        return None

    def map_search_item(self, item: Dict[str, Any]) -> SearchItem:
        cover_id = item.get('cover_i')
        image_url = self._build_cover_url(cover_id, 'M')

        description = None
        first_sentence = item.get('first_sentence')
        if first_sentence and isinstance(first_sentence, list) and len(first_sentence) > 0:
            description = first_sentence[0]

        return SearchItem(
            id=self._extract_id_from_key(item.get('key')),
            type=SearchItemType.BOOK,
            title=item.get('title', ''),
            original_title=item.get('title', ''),
            authors=item.get('author_name', []) if item.get('author_name') else None,
            image_url=image_url,
            release_date=self._parse_publish_date(item.get('publish_date'), item.get('first_publish_year')),
            description=description
        )

    def map_detail(self, item: Dict[str, Any]) -> Book:
        cover_id = item.get('cover_i')
        image_url = self._build_cover_url(cover_id, 'M')
        images = self._build_images(cover_id)

        description = None
        first_sentence = item.get('first_sentence')
        if first_sentence and isinstance(first_sentence, list) and len(first_sentence) > 0:
            description = first_sentence[0]

        return Book(
            id=self._extract_id_from_key(item.get('key')),
            title=item.get('title', ''),
            authors=item.get('author_name', []) if item.get('author_name') else None,
            image_url=image_url,
            release_date=self._parse_publish_date(item.get('publish_date'), item.get('first_publish_year')),
            pages=item.get('number_of_pages_median'),
            description=description,
            images=images
        )
