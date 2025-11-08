from typing import Optional, Dict, List
from dataclasses import dataclass
from proxy.models.base import Images


@dataclass
class Book:
    id: str
    title: str
    authors: Optional[List[str]] = None
    image_url: Optional[str] = None
    release_date: Optional[str] = None
    pages: Optional[int] = None
    description: Optional[str] = None
    images: Optional[Images] = None

    def to_dict(self) -> Dict:
        result = {
            'id': self.id,
            'title': self.title,
            'authors': self.authors,
            'image_url': self.image_url,
            'release_date': self.release_date,
            'pages': self.pages,
            'description': self.description,
        }

        if self.images:
            result['images'] = self.images.to_dict()

        return result


@dataclass
class SearchItem:
    id: str
    title: str
    authors: Optional[List[str]] = None
    image_url: Optional[str] = None
    release_date: Optional[str] = None
    pages: Optional[int] = None
    description: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'title': self.title,
            'authors': self.authors,
            'image_url': self.image_url,
            'release_date': self.release_date,
            'pages': self.pages,
            'description': self.description
        }
