from typing import Optional, Dict, List, Union
from dataclasses import dataclass, field
from proxy.constants import ImageType, ImageSize, ContentType, AuthorType


@dataclass
class Author:
    name: str
    type: str

    def to_dict(self) -> Dict:
        return {
            'name': self.name,
            'type': self.type
        }


@dataclass
class Platform:
    name: str
    image_url: Optional[str] = None
    actions: Optional[List[str]] = None

    def to_dict(self) -> Dict:
        result = {
            'title': self.name,
            'image_url': self.image_url
        }
        if self.actions is not None:
            result['actions'] = self.actions
        return result


@dataclass
class Images:
    poster_standard: Optional[str] = None
    poster_original: Optional[str] = None
    gallery_standard: Optional[str] = None
    gallery_original: Optional[str] = None
    additional_galleries: Union[List[Dict[str, str]], List[str]] = field(default_factory=list)

    def to_dict(self) -> List[Dict]:
        images = []
        if self.poster_standard:
            images.append({
                'type': ImageType.POSTER,
                'size': ImageSize.STANDARD,
                'image_url': self.poster_standard
            })
        if self.poster_original:
            images.append({
                'type': ImageType.POSTER,
                'size': ImageSize.ORIGINAL,
                'image_url': self.poster_original
            })
        if self.gallery_standard:
            images.append({
                'type': ImageType.GALLERY,
                'size': ImageSize.STANDARD,
                'image_url': self.gallery_standard
            })
        if self.gallery_original:
            images.append({
                'type': ImageType.GALLERY,
                'size': ImageSize.ORIGINAL,
                'image_url': self.gallery_original
            })
        for gallery_item in self.additional_galleries[:8]:
            if isinstance(gallery_item, dict):
                if gallery_item.get('standard'):
                    images.append({
                        'type': ImageType.GALLERY,
                        'size': ImageSize.STANDARD,
                        'image_url': gallery_item['standard']
                    })
                if gallery_item.get('original'):
                    images.append({
                        'type': ImageType.GALLERY,
                        'size': ImageSize.ORIGINAL,
                        'image_url': gallery_item['original']
                    })
            elif isinstance(gallery_item, str):
                images.append({
                    'type': ImageType.GALLERY,
                    'size': ImageSize.ORIGINAL,
                    'image_url': gallery_item
                })
        return images


@dataclass
class SearchItem:
    id: Union[int, str]
    type: str
    title: str
    original_title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    release_date: Optional[str] = None
    authors: Optional[List[Author]] = None

    def to_dict(self) -> Dict:
        result = {
            'id': self.id,
            'type': self.type,
            'title': self.title,
            'description': self.description,
            'image_url': self.image_url,
            'release_date': self.release_date
        }

        if self.original_title is not None:
            result['original_title'] = self.original_title

        if self.authors is not None:
            result['authors'] = [author.to_dict() for author in self.authors]

        return result