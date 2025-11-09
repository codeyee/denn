from typing import Optional, Dict, List
from dataclasses import dataclass
from proxy.models.base import Images, Platform, Author


@dataclass
class Movie:
    id: int
    title: str
    original_title: str
    content_type: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    tagline: Optional[str] = None
    imdb_id: Optional[str] = None
    release_date: Optional[str] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    authors: Optional[List[Author]] = None
    images: Optional[Images] = None
    platforms: Optional[Dict[str, List[Platform]]] = None

    def to_dict(self) -> Dict:
        result = {
            'id': self.id,
            'type': self.content_type,
            'imdb_id': self.imdb_id,
            'title': self.title,
            'original_title': self.original_title,
            'tagline': self.tagline,
            'description': self.description,
            'image_url': self.image_url,
            'release_date': self.release_date,
            'status': self.status,
            'duration_minutes': self.duration_minutes,
        }

        if self.authors:
            result['authors'] = [author.to_dict() for author in self.authors]

        if self.images:
            result['images'] = self.images.to_dict()

        if self.platforms:
            result['platforms'] = {
                country: [platform.to_dict() for platform in platforms]
                for country, platforms in self.platforms.items()
            }

        return result