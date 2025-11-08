from typing import Optional, Dict, List
from dataclasses import dataclass
from proxy.models.base import Images, Provider


@dataclass
class Movie:
    id: int
    title: str
    original_title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    tagline: Optional[str] = None
    imdb_id: Optional[str] = None
    release_date: Optional[str] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    images: Optional[Images] = None
    providers: Optional[Dict[str, List[Provider]]] = None

    def to_dict(self) -> Dict:
        result = {
            'id': self.id,
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
        if self.images:
            result['images'] = self.images.to_dict()

        if self.providers:
            result['providers'] = {
                country: [provider.to_dict() for provider in providers]
                for country, providers in self.providers.items()
            }

        return result