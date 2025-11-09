from typing import Optional, Dict, List
from dataclasses import dataclass
from proxy.models.base import Images, Platform, Author


@dataclass
class Game:
    id: int
    title: str
    content_type: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    game_type: Optional[str] = None
    release_date: Optional[str] = None
    authors: Optional[List[Author]] = None
    platforms: Optional[List[Platform]] = None
    images: Optional[Images] = None

    def to_dict(self) -> Dict:
        result = {
            'id': self.id,
            'type': self.content_type,
            'title': self.title,
            'game_type': self.game_type,
            'description': self.description,
            'image_url': self.image_url,
            'release_date': self.release_date,
        }

        if self.authors:
            result['authors'] = [author.to_dict() for author in self.authors]

        if self.platforms:
            result['platforms'] = [p.to_dict() for p in self.platforms]

        if self.images:
            result['images'] = self.images.to_dict()

        return result


