from typing import Optional, Dict, List
from dataclasses import dataclass, field
from proxy.models.base import Images


@dataclass
class Track:
    id: str
    title: str
    track_number: int
    authors: Optional[List[str]] = None
    duration_seconds: Optional[int] = None
    external_url: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'title': self.title,
            'authors': self.authors,
            'track_number': self.track_number,
            'duration_seconds': self.duration_seconds,
            'external_url': self.external_url
        }


@dataclass
class Album:
    id: str
    title: str
    authors: Optional[List[str]] = None
    image_url: Optional[str] = None
    release_date: Optional[str] = None
    total_tracks: Optional[int] = None
    duration_minutes: Optional[int] = None
    album_type: Optional[str] = None
    external_url: Optional[str] = None
    images: Optional[Images] = None
    tracks: List[Track] = field(default_factory=list)

    def to_dict(self) -> Dict:
        result = {
            'id': self.id,
            'title': self.title,
            'authors': self.authors,
            'image_url': self.image_url,
            'release_date': self.release_date,
            'total_tracks': self.total_tracks,
            'duration_minutes': self.duration_minutes,
            'album_type': self.album_type,
            'external_url': self.external_url,
        }

        if self.images:
            result['images'] = self.images.to_dict()

        if self.tracks:
            result['tracks'] = [track.to_dict() for track in self.tracks]

        return result


@dataclass
class SearchItem:
    id: str
    title: str
    authors: Optional[List[str]] = None
    image_url: Optional[str] = None
    release_date: Optional[str] = None
    total_tracks: Optional[int] = None
    album_type: Optional[str] = None
    external_url: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'type': 'album',
            'title': self.title,
            'authors': self.authors,
            'image_url': self.image_url,
            'release_date': self.release_date,
            'total_tracks': self.total_tracks,
            'album_type': self.album_type,
            'external_url': self.external_url
        }
