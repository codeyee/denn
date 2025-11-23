from typing import Optional, Dict, List
from dataclasses import dataclass, field
from proxy.models.base import Images, Platform, Author


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
    content_type: str
    number_of_episodes: int = 0
    description: Optional[str] = None
    release_date: Optional[str] = None
    image_url: Optional[str] = None
    tv_show_name: Optional[str] = None
    images: Optional[Images] = None
    episodes: List[Episode] = field(default_factory=list)
    platforms: Optional[Dict[str, List[Platform]]] = None

    def to_dict(self, images_size: int = 18) -> Dict:
        result = {
            'id': self.id,
            'type': self.content_type,
            'season_number': self.season_number,
            'title': self.title,
            'tv_show_name': self.tv_show_name,
            'description': self.description,
            'image_url': self.image_url,
            'release_date': self.release_date,
            'number_of_episodes': self.number_of_episodes
        }

        if self.images:
            result['images'] = self.images.to_dict(images_size=images_size)

        if self.platforms:
            result['platforms'] = {
                country: [p.to_dict() for p in platforms]
                for country, platforms in self.platforms.items()
            }

        if self.episodes:
            result['episodes'] = [ep.to_dict() for ep in self.episodes]

        return result


@dataclass
class TVShow:
    id: int
    title: str
    original_title: str
    content_type: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    tagline: Optional[str] = None
    imdb_id: Optional[str] = None
    release_date: Optional[str] = None
    status: Optional[str] = None
    number_of_seasons: Optional[int] = None
    number_of_episodes: Optional[int] = None
    authors: Optional[List[Author]] = None
    images: Optional[Images] = None
    platforms: Optional[Dict[str, List[Platform]]] = None
    seasons: List[Season] = field(default_factory=list)

    def to_dict(self, images_size: int = 18) -> Dict:
        result = {
            'id': self.id,
            'type': self.content_type,
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

        if self.authors:
            result['authors'] = [author.to_dict() for author in self.authors]

        if self.images:
            result['images'] = self.images.to_dict(images_size=images_size)

        if self.platforms:
            result['platforms'] = {
                country: [platform.to_dict() for platform in platforms]
                for country, platforms in self.platforms.items()
            }

        if self.seasons:
            result['seasons'] = [season.to_dict(images_size=images_size) for season in self.seasons]
        return result
