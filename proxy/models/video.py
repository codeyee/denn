from typing import Optional, Dict, List
from dataclasses import dataclass, field
from proxy.models.base import Images, Provider


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
