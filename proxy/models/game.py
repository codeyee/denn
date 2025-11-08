from typing import Optional, Dict, List
from dataclasses import dataclass
from proxy.models.base import Images, Provider


@dataclass
class Game:
    id: int
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    game_type: Optional[str] = None
    release_date: Optional[str] = None
    authors: Optional[List[str]] = None
    providers: Optional[List[Provider]] = None
    images: Optional[Images] = None

    def to_dict(self) -> Dict:
        result = {
            'id': self.id,
            'title': self.title,
            'type': self.game_type,
            'description': self.description,
            'image_url': self.image_url,
            'release_date': self.release_date,
            'authors': self.authors,
        }

        if self.providers:
            result['providers'] = [p.to_dict() for p in self.providers]

        if self.images:
            result['images'] = self.images.to_dict()

        return result


