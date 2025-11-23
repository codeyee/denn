from typing import Optional, Dict, List
from dataclasses import dataclass
from proxy.models.base import Images, Author


@dataclass
class Book:
    id: str
    title: str
    content_type: str
    authors: Optional[List[Author]] = None
    image_url: Optional[str] = None
    release_date: Optional[str] = None
    pages: Optional[int] = None
    description: Optional[str] = None
    images: Optional[Images] = None

    def to_dict(self, images_size: int = 18) -> Dict:
        result = {
            'id': self.id,
            'type': self.content_type,
            'title': self.title,
            'image_url': self.image_url,
            'release_date': self.release_date,
            'pages': self.pages,
            'description': self.description,
        }

        if self.authors:
            result['authors'] = [author.to_dict() for author in self.authors]

        if self.images:
            result['images'] = self.images.to_dict(images_size=images_size)

        return result
