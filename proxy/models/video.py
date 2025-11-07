from typing import Optional, Dict, List
from dataclasses import dataclass, field
from proxy.constants import ImageType, ImageSize


@dataclass
class Provider:
    name: str
    actions: List[str]
    image_url: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            'title': self.name,
            'image_url': self.image_url,
            'actions': self.actions
        }


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
class Episode:
    id: int
    episode_number: int
    season_number: int
    title: str
    description: Optional[str] = None
    release_date: Optional[str] = None
    duration_minutes: Optional[int] = None
    image_url: Optional[str] = None
    episode_type: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'season_number': self.season_number,
            'episode_number': self.episode_number,
            'title': self.title,
            'description': self.description,
            'image_url': self.image_url,
            'release_date': self.release_date,
            'duration_minutes': self.duration_minutes
        }


@dataclass
class Season:
    id: int
    season_number: int
    title: str
    number_of_episodes: int = 0
    description: Optional[str] = None
    release_date: Optional[str] = None
    image_url: Optional[str] = None
    tv_show_name: Optional[str] = None
    images: Optional[Images] = None
    episodes: List[Episode] = field(default_factory=list)
    providers: Optional[Dict[str, List[Provider]]] = None

    def to_dict(self) -> Dict:
        result = {
            'id': self.id,
            'season_number': self.season_number,
            'title': self.title,
            'tv_show_name': self.tv_show_name,
            'description': self.description,
            'image_url': self.image_url,
            'release_date': self.release_date,
            'number_of_episodes': self.number_of_episodes
        }

        if self.images:
            result['images'] = self.images.to_dict()

        if self.providers:
            result['providers'] = {
                country: [p.to_dict() for p in providers]
                for country, providers in self.providers.items()
            }

        if self.episodes:
            result['episodes'] = [ep.to_dict() for ep in self.episodes]

        return result


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


@dataclass
class TVShow:
    id: int
    title: str
    original_title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    tagline: Optional[str] = None
    imdb_id: Optional[str] = None
    release_date: Optional[str] = None
    status: Optional[str] = None
    number_of_seasons: Optional[int] = None
    number_of_episodes: Optional[int] = None
    images: Optional[Images] = None
    providers: Optional[Dict[str, List[Provider]]] = None
    seasons: List[Season] = field(default_factory=list)

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
            'number_of_seasons': self.number_of_seasons,
            'number_of_episodes': self.number_of_episodes
        }

        if self.images:
            result['images'] = self.images.to_dict()

        if self.providers:
            result['providers'] = {
                country: [provider.to_dict() for provider in providers]
                for country, providers in self.providers.items()
            }

        if self.seasons:
            result['seasons'] = [season.to_dict() for season in self.seasons]
        return result


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
