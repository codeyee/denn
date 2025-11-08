from typing import Optional, Dict, List
from dataclasses import dataclass, field
from proxy.constants import ImageType, ImageSize


@dataclass
class Provider:
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
    additional_posters: List[str] = field(default_factory=list)
    additional_galleries: List[str] = field(default_factory=list)

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
        for poster_url in self.additional_posters[:4]:
            images.append({
                'type': ImageType.POSTER,
                'size': ImageSize.ORIGINAL,
                'image_url': poster_url
            })
        for gallery_url in self.additional_galleries[:4]:
            images.append({
                'type': ImageType.GALLERY,
                'size': ImageSize.ORIGINAL,
                'image_url': gallery_url
            })
        return images


@dataclass
class SearchItem:
    id: int
    type: str
    title: str
    original_title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    release_date: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'type': self.type,
            'title': self.title,
            'original_title': self.original_title,
            'description': self.description,
            'image_url': self.image_url,
            'release_date': self.release_date
        }