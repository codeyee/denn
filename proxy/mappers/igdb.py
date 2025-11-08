import re
from typing import Dict, Any, Optional, List
from datetime import datetime
from proxy.models.game import Game
from proxy.models.base import SearchItem, Images, Provider
from proxy.clients.igdb import IGDBClient
from proxy.constants import SearchItemType

IGDB_IMAGE_BASE_URL = 'https://images.igdb.com/igdb/image/upload'

GAME_TYPE_MAP = {
    0: "Main game",
    8: "Remake",
}


def build_igdb_image_url(image_id: Optional[str], size: str) -> Optional[str]:
    if not image_id:
        return None
    return f'{IGDB_IMAGE_BASE_URL}/t_{size}/{image_id}.jpg'


def extract_image_id(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    match = re.search(r'/([^/]+)\.jpg$', url)
    if match:
        return match.group(1)
    return None


class IGDBMapper:
    def __init__(self, client: IGDBClient):
        self.client = client

    def _format_release_date(self, timestamp: Optional[int]) -> Optional[str]:
        if not timestamp:
            return None
        try:
            return datetime.utcfromtimestamp(timestamp).strftime('%Y-%m-%d')
        except (ValueError, OSError):
            return None

    def _extract_platforms(self, platforms: Optional[List[Dict[str, Any]]]) -> Optional[List[Provider]]:
        if not platforms:
            return None

        providers = []
        for platform in platforms:
            name = platform.get('name')
            if name:
                providers.append(Provider(name=name))

        return providers if providers else None

    def _extract_authors(self, involved_companies: Optional[List[Dict[str, Any]]]) -> Optional[List[str]]:
        if not involved_companies:
            return None

        authors = []
        for company in involved_companies:
            if company.get('developer') and company.get('company', {}).get('name'):
                authors.append(company['company']['name'])

        return authors if authors else None

    def _format_game_type(self, game_type: Optional[int]) -> Optional[str]:
        if game_type is None:
            return None
        return GAME_TYPE_MAP.get(game_type, "Unknown")

    def _build_description(self, summary: Optional[str], storyline: Optional[str]) -> Optional[str]:
        if not summary and not storyline:
            return None
        if summary and storyline:
            return summary + '\n\n' + storyline
        return summary if summary else storyline

    def _get_image_id_from_cover(self, cover_data: Optional[Dict[str, Any]]) -> Optional[str]:
        if not cover_data:
            return None

        image_id = cover_data.get('image_id')
        if image_id:
            return image_id

        url = cover_data.get('url')
        return extract_image_id(url)

    def _build_images(self, item: Dict[str, Any]) -> Images:
        cover_data = item.get('cover') if isinstance(item.get('cover'), dict) else None
        poster_image_id = self._get_image_id_from_cover(cover_data)

        poster_standard = build_igdb_image_url(poster_image_id, '720p')
        poster_original = build_igdb_image_url(poster_image_id, '1080p')

        screenshots = item.get('screenshots', [])
        additional_galleries = []

        if isinstance(screenshots, list):
            for screenshot in screenshots[:4]:
                if isinstance(screenshot, dict):
                    image_id = screenshot.get('image_id')
                    if not image_id:
                        image_id = extract_image_id(screenshot.get('url'))

                    if image_id:
                        gallery_url = build_igdb_image_url(image_id, '1080p')
                        if gallery_url:
                            additional_galleries.append(gallery_url)

        artworks = item.get('artworks', [])
        if isinstance(artworks, list):
            for artwork in artworks[:4]:
                if isinstance(artwork, dict):
                    image_id = artwork.get('image_id')
                    if not image_id:
                        image_id = extract_image_id(artwork.get('url'))

                    if image_id:
                        gallery_url = build_igdb_image_url(image_id, '1080p')
                        if gallery_url:
                            additional_galleries.append(gallery_url)

        gallery_standard = None
        gallery_original = None
        if screenshots and isinstance(screenshots, list) and len(screenshots) > 0:
            first_screenshot = screenshots[0]
            if isinstance(first_screenshot, dict):
                image_id = first_screenshot.get('image_id')
                if not image_id:
                    image_id = extract_image_id(first_screenshot.get('url'))
                if image_id:
                    gallery_standard = build_igdb_image_url(image_id, 'screenshot_huge')
                    gallery_original = build_igdb_image_url(image_id, '1080p')

        return Images(
            poster_standard=poster_standard,
            poster_original=poster_original,
            gallery_standard=gallery_standard,
            gallery_original=gallery_original,
            additional_galleries=additional_galleries[:4]
        )

    def map_search_item(self, item: Dict[str, Any]) -> SearchItem:
        if isinstance(item, list) and len(item) > 0:
            item = item[0]

        cover_data = item.get('cover') if isinstance(item.get('cover'), dict) else None
        poster_image_id = self._get_image_id_from_cover(cover_data)
        image_url = build_igdb_image_url(poster_image_id, '720p')

        return SearchItem(
            id=item.get('id'),
            type=SearchItemType.GAME,
            title=item.get('name', ''),
            original_title=item.get('name', ''),
            description=self._build_description(item.get('summary'), item.get('storyline')),
            image_url=image_url,
            release_date=self._format_release_date(item.get('first_release_date'))
        )

    def map_detail(self, item: Dict[str, Any]) -> Game:
        if isinstance(item, list) and len(item) > 0:
            item = item[0]

        cover_data = item.get('cover') if isinstance(item.get('cover'), dict) else None
        poster_image_id = self._get_image_id_from_cover(cover_data)
        image_url = build_igdb_image_url(poster_image_id, '720p')

        images = self._build_images(item)
        providers = self._extract_platforms(item.get('platforms'))
        authors = self._extract_authors(item.get('involved_companies'))

        return Game(
            id=item.get('id'),
            title=item.get('name', ''),
            description=self._build_description(item.get('summary'), item.get('storyline')),
            image_url=image_url,
            game_type=self._format_game_type(item.get('game_type')),
            release_date=self._format_release_date(item.get('first_release_date')),
            authors=authors,
            providers=providers,
            images=images
        )
