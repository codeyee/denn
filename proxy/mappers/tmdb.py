from typing import Dict, Any, Optional, List, Tuple
from concurrent.futures import ThreadPoolExecutor
from django.conf import settings
from rest_framework import status as http_status
from proxy.models.base import Images, Platform, Author
from proxy.models.movie import Movie
from proxy.models.tv_show import TVShow, Season, Episode
from proxy.models.base import SearchItem
from proxy.clients.tmdb import TMDBClient
from proxy.constants import ProviderAction, SearchItemType, AuthorType


def build_image_url(path: Optional[str], size: str = 'w500') -> Optional[str]:
    if not path:
        return None

    base_url = settings.PROXY_API["TMDB"]["IMAGES_BASE_URL"]
    base_url = base_url.rsplit('/', 1)[0]
    return f'{base_url}/{size}{path}'


class TMDBMapper:
    def __init__(self, client: TMDBClient):
        self.client = client

    def _process_images_data(self, images_data: Optional[Dict[str, Any]]) -> Tuple[List[str], List[str]]:
        additional_posters = []
        additional_galleries = []

        if not images_data:
            return additional_posters, additional_galleries

        posters = images_data.get('posters', [])[:4]
        for poster in posters:
            file_path = poster.get('file_path')
            if file_path:
                additional_posters.append(build_image_url(file_path, 'original'))

        backdrops = images_data.get('backdrops', [])[:4]
        for backdrop in backdrops:
            file_path = backdrop.get('file_path')
            if file_path:
                additional_galleries.append(build_image_url(file_path, 'original'))

        logos = images_data.get('logos', [])[:4]
        for logo in logos:
            file_path = logo.get('file_path')
            if file_path:
                additional_galleries.append(build_image_url(file_path, 'original'))

        return additional_posters, additional_galleries

    def _build_images(
        self,
        poster_path: Optional[str],
        gallery_path: Optional[str],
        images_data: Optional[Dict[str, Any]] = None
    ) -> Images:
        additional_posters, additional_galleries = self._process_images_data(images_data)

        return Images(
            poster_standard=build_image_url(poster_path, 'w500'),
            poster_original=build_image_url(poster_path, 'original'),
            gallery_standard=build_image_url(gallery_path, 'w1280'),
            gallery_original=build_image_url(gallery_path, 'original'),
            additional_posters=additional_posters,
            additional_galleries=additional_galleries
        )

    def _process_flatrate_platforms(self, flatrate_list: List[Dict], platforms_map: Dict[str, Platform]) -> None:
        for platform in flatrate_list:
            platform_id = platform.get('provider_id')
            if not platform_id:
                continue

            platform_name = platform.get('provider_name', '')
            logo_path = platform.get('logo_path')
            image_url = build_image_url(logo_path, 'w500')

            if platform_name not in platforms_map:
                platforms_map[platform_name] = Platform(
                    name=platform_name,
                    image_url=image_url,
                    actions=[]
                )
            else:
                if not platforms_map[platform_name].image_url and image_url:
                    platforms_map[platform_name].image_url = image_url

            if ProviderAction.STREAMING not in platforms_map[platform_name].actions:
                platforms_map[platform_name].actions.append(ProviderAction.STREAMING)

    def _process_rent_platforms(self, rent_list: List[Dict], platforms_map: Dict[str, Platform]) -> None:
        for platform in rent_list:
            platform_id = platform.get('provider_id')
            if not platform_id:
                continue

            platform_name = platform.get('provider_name', '')
            logo_path = platform.get('logo_path')
            image_url = build_image_url(logo_path, 'w500')

            if platform_name not in platforms_map:
                platforms_map[platform_name] = Platform(
                    name=platform_name,
                    image_url=image_url,
                    actions=[]
                )
            else:
                if not platforms_map[platform_name].image_url and image_url:
                    platforms_map[platform_name].image_url = image_url

            if ProviderAction.RENT not in platforms_map[platform_name].actions:
                platforms_map[platform_name].actions.append(ProviderAction.RENT)

    def _process_buy_platforms(self, buy_list: List[Dict], platforms_map: Dict[str, Platform]) -> None:
        for platform in buy_list:
            platform_id = platform.get('provider_id')
            if not platform_id:
                continue

            platform_name = platform.get('provider_name', '')
            logo_path = platform.get('logo_path')
            image_url = build_image_url(logo_path, 'w500')

            if platform_name not in platforms_map:
                platforms_map[platform_name] = Platform(
                    name=platform_name,
                    image_url=image_url,
                    actions=[]
                )
            else:
                if not platforms_map[platform_name].image_url and image_url:
                    platforms_map[platform_name].image_url = image_url

            if ProviderAction.BUY not in platforms_map[platform_name].actions:
                platforms_map[platform_name].actions.append(ProviderAction.BUY)

    def _normalize_country_platforms(self, country_data: Dict[str, Any]) -> List[Platform]:
        platforms_map: Dict[str, Platform] = {}

        flatrate_list = country_data.get('flatrate', [])
        rent_list = country_data.get('rent', [])
        buy_list = country_data.get('buy', [])

        self._process_flatrate_platforms(flatrate_list, platforms_map)
        self._process_rent_platforms(rent_list, platforms_map)
        self._process_buy_platforms(buy_list, platforms_map)

        platforms_list = list(platforms_map.values())
        platforms_list.sort(key=lambda x: x.name)
        return platforms_list

    def _normalize_platforms(
        self,
        results: Optional[Dict[str, Any]],
        country: Optional[str] = None
    ) -> Optional[Dict[str, List[Platform]]]:
        if not results:
            return None

        if country:
            country_upper = country.upper()
            if country_upper not in results:
                return None

            country_data = results[country_upper]
            if not isinstance(country_data, dict):
                return None

            platforms_list = self._normalize_country_platforms(country_data)
            return {country_upper: platforms_list} if platforms_list else None

        platforms_by_country: Dict[str, List[Platform]] = {}

        for country_key, country_data in results.items():
            if not isinstance(country_data, dict):
                continue

            platforms_list = self._normalize_country_platforms(country_data)
            if platforms_list:
                platforms_by_country[country_key] = platforms_list

        return platforms_by_country if platforms_by_country else None

    def _extract_authors(self, movie_or_tv_data: Dict[str, Any]) -> Optional[List[Author]]:
        production_companies = movie_or_tv_data.get('production_companies', [])
        if not production_companies:
            return None

        authors = []
        for company in production_companies:
            company_name = company.get('name')
            if company_name:
                authors.append(Author(
                    name=company_name,
                    type=AuthorType.COMPANY
                ))

        return authors if authors else None

    def _normalize_media_type(self, media_type: Optional[str]) -> str:
        if not media_type:
            return media_type

        media_type_lower = media_type.lower()

        if media_type_lower == 'movie':
            return SearchItemType.MOVIE

        elif media_type_lower == 'tv':
            return SearchItemType.TV_SHOW

        elif media_type_lower == 'person':
            return SearchItemType.PERSON

        else:
            return media_type.upper()

    def map_search_item(self, item: Dict[str, Any], media_type: Optional[str] = None) -> SearchItem:
        raw_type = media_type or item.get('media_type')
        item_type = self._normalize_media_type(raw_type)
        title = item.get('title') or item.get('name') or ''
        original_title = item.get('original_title') or item.get('original_name') or ''
        release_date = item.get('release_date') or item.get('first_air_date')

        return SearchItem(
            id=item.get('id'),
            type=item_type,
            title=title,
            original_title=original_title,
            description=item.get('overview'),
            image_url=build_image_url(item.get('poster_path')),
            release_date=release_date
        )

    def map_episode(self, episode: Dict[str, Any]) -> Episode:
        return Episode(
            id=episode.get('id'),
            episode_number=episode.get('episode_number'),
            season_number=episode.get('season_number'),
            episode_type=episode.get('episode_type'),
            title=episode.get('name', ''),
            description=episode.get('overview'),
            release_date=episode.get('air_date'),
            duration_minutes=episode.get('runtime'),
            image_url=build_image_url(episode.get('still_path'))
        )

    def map_season(
        self,
        season_data: Dict[str, Any],
        tv_show_name: Optional[str] = None,
        tv_show_backdrop_path: Optional[str] = None,
        platforms_data: Optional[Dict[str, Any]] = None,
        images_data: Optional[Dict[str, Any]] = None,
        country: Optional[str] = None
    ) -> Season:
        episodes = [self.map_episode(ep) for ep in season_data.get('episodes', [])]

        images = self._build_images(
            season_data.get('poster_path'),
            tv_show_backdrop_path,
            images_data
        )

        platforms = None
        if platforms_data:
            results = platforms_data.get('results', {})
            platforms = self._normalize_platforms(results, country)

        return Season(
            id=season_data.get('id'),
            season_number=season_data.get('season_number'),
            title=season_data.get('name', ''),
            description=season_data.get('overview'),
            release_date=season_data.get('air_date'),
            image_url=build_image_url(season_data.get('poster_path')),
            number_of_episodes=len(episodes) if episodes else season_data.get('episode_count', 0),
            tv_show_name=tv_show_name,
            images=images,
            episodes=episodes,
            platforms=platforms
        )

    def map_movie(
        self,
        movie_data: Dict[str, Any],
        external_ids_data: Optional[Dict[str, Any]] = None,
        platforms_data: Optional[Dict[str, Any]] = None,
        images_data: Optional[Dict[str, Any]] = None,
        country: Optional[str] = None
    ) -> Movie:
        images = self._build_images(
            movie_data.get('poster_path'),
            movie_data.get('backdrop_path'),
            images_data
        )

        imdb_id = None
        if external_ids_data:
            imdb_id = external_ids_data.get('imdb_id')

        platforms = None
        if platforms_data:
            results = platforms_data.get('results', {})
            platforms = self._normalize_platforms(results, country)

        authors = self._extract_authors(movie_data)

        return Movie(
            id=movie_data.get('id'),
            title=movie_data.get('title', ''),
            original_title=movie_data.get('original_title', ''),
            description=movie_data.get('overview'),
            image_url=build_image_url(movie_data.get('poster_path')),
            tagline=movie_data.get('tagline'),
            imdb_id=imdb_id,
            release_date=movie_data.get('release_date'),
            duration_minutes=movie_data.get('runtime'),
            status=movie_data.get('status'),
            authors=authors,
            images=images,
            platforms=platforms
        )

    def map_tv_show(
        self,
        tv_data: Dict[str, Any],
        external_ids_data: Optional[Dict[str, Any]] = None,
        platforms_data: Optional[Dict[str, Any]] = None,
        images_data: Optional[Dict[str, Any]] = None,
        country: Optional[str] = None
    ) -> TVShow:
        images = self._build_images(
            tv_data.get('poster_path'),
            tv_data.get('backdrop_path'),
            images_data
        )

        seasons = [
            self.map_season(season) for season in tv_data.get('seasons', [])
        ]

        imdb_id = None
        if external_ids_data:
            imdb_id = external_ids_data.get('imdb_id')

        platforms = None
        if platforms_data:
            results = platforms_data.get('results', {})
            platforms = self._normalize_platforms(results, country)

        authors = self._extract_authors(tv_data)

        return TVShow(
            id=tv_data.get('id'),
            title=tv_data.get('name', ''),
            original_title=tv_data.get('original_name', ''),
            description=tv_data.get('overview'),
            image_url=build_image_url(tv_data.get('poster_path')),
            tagline=tv_data.get('tagline'),
            imdb_id=imdb_id,
            release_date=tv_data.get('first_air_date'),
            status=tv_data.get('status'),
            number_of_seasons=tv_data.get('number_of_seasons'),
            number_of_episodes=tv_data.get('number_of_episodes'),
            authors=authors,
            images=images,
            platforms=platforms,
            seasons=seasons
        )

    def get_movie_complete(self, movie_id: int, country: Optional[str] = None) -> Tuple[Optional[Movie], int]:
        with ThreadPoolExecutor(max_workers=4) as executor:
            movie_future = executor.submit(self.client.get_movie_details, movie_id)
            external_ids_future = executor.submit(self.client.get_movie_external_ids, movie_id)
            watch_providers_future = executor.submit(self.client.get_movie_watch_providers, movie_id)
            images_future = executor.submit(self.client.get_movie_images, movie_id)

            movie_data, movie_status = movie_future.result()
            if movie_status != http_status.HTTP_200_OK:
                return None, movie_status

            external_ids_data, external_ids_status = external_ids_future.result()
            platforms_data, watch_providers_status = watch_providers_future.result()
            images_data, images_status = images_future.result()

            movie = self.map_movie(
                movie_data,
                external_ids_data if external_ids_status == http_status.HTTP_200_OK else None,
                platforms_data if watch_providers_status == http_status.HTTP_200_OK else None,
                images_data if images_status == http_status.HTTP_200_OK else None,
                country
            )

            return movie, http_status.HTTP_200_OK

    def get_tv_show_complete(self, tv_id: int, country: Optional[str] = None) -> Tuple[Optional[TVShow], int]:
        with ThreadPoolExecutor(max_workers=4) as executor:
            tv_future = executor.submit(self.client.get_tv_details, tv_id)
            external_ids_future = executor.submit(self.client.get_tv_external_ids, tv_id)
            watch_providers_future = executor.submit(self.client.get_tv_watch_providers, tv_id)
            images_future = executor.submit(self.client.get_tv_images, tv_id)

            tv_data, tv_status = tv_future.result()
            if tv_status != http_status.HTTP_200_OK:
                return None, tv_status

            external_ids_data, external_ids_status = external_ids_future.result()
            platforms_data, watch_providers_status = watch_providers_future.result()
            images_data, images_status = images_future.result()

            tv_show = self.map_tv_show(
                tv_data,
                external_ids_data if external_ids_status == http_status.HTTP_200_OK else None,
                platforms_data if watch_providers_status == http_status.HTTP_200_OK else None,
                images_data if images_status == http_status.HTTP_200_OK else None,
                country
            )

            return tv_show, http_status.HTTP_200_OK

    def get_season_complete(
        self,
        tv_id: int,
        season_number: int,
        country: Optional[str] = None
    ) -> Tuple[Optional[Season], int]:
        with ThreadPoolExecutor(max_workers=4) as executor:
            season_future = executor.submit(self.client.get_season_details, tv_id, season_number)
            tv_future = executor.submit(self.client.get_tv_details, tv_id)
            watch_providers_future = executor.submit(
                self.client.get_season_watch_providers, tv_id, season_number
            )
            images_future = executor.submit(
                self.client.get_season_images, tv_id, season_number
            )

            season_data, season_status = season_future.result()
            if season_status != http_status.HTTP_200_OK:
                return None, season_status

            tv_data, tv_status = tv_future.result()
            tv_show_name = None
            tv_show_backdrop_path = None
            if tv_status == http_status.HTTP_200_OK:
                tv_show_name = tv_data.get('name')
                tv_show_backdrop_path = tv_data.get('backdrop_path')

            platforms_data, watch_providers_status = watch_providers_future.result()
            images_data, images_status = images_future.result()

            season = self.map_season(
                season_data,
                tv_show_name,
                tv_show_backdrop_path,
                platforms_data if watch_providers_status == http_status.HTTP_200_OK else None,
                images_data if images_status == http_status.HTTP_200_OK else None,
                country
            )

            return season, http_status.HTTP_200_OK
