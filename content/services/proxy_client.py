import logging
from typing import Optional, Dict, Any, List

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 15


class ProxyAPIError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"Proxy API error {status_code}: {message}")


class ProxyAPIClient:
    """HTTP client for the Go proxy microservice."""

    def __init__(self):
        self.base_url = settings.PROXY_API_BASE_URL.rstrip("/")
        self.api_key = settings.PROXY_API_KEY
        self._session = requests.Session()
        self._session.headers.update({"X-Api-Key": self.api_key})

    def _headers(self, country: Optional[str] = None) -> Dict[str, str]:
        headers: Dict[str, str] = {}
        if country:
            headers["X-User-Country"] = country
        return headers

    def _get(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        country: Optional[str] = None,
        timeout: int = DEFAULT_TIMEOUT,
    ) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}{path}"
        if getattr(settings, "TESTING", False):
            return None

        try:
            resp = self._session.get(
                url,
                params=params,
                headers=self._headers(country),
                timeout=timeout,
            )
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as e:
            logger.warning("Proxy API HTTP error: %s %s -> %s", path, params, e)
            return None
        except requests.exceptions.RequestException as e:
            logger.error("Proxy API request failed: %s %s -> %s", path, params, e)
            return None

    # ── Detail endpoints ──────────────────────────────────────────────

    def get_movie(self, movie_id: str, country: Optional[str] = None) -> Optional[Dict[str, Any]]:
        return self._get(f"/movies/{movie_id}", country=country)

    def get_tv_show(self, tv_id: str, country: Optional[str] = None) -> Optional[Dict[str, Any]]:
        return self._get(f"/tv-shows/{tv_id}", country=country)

    def get_season(self, tv_id: str, season_number: int, country: Optional[str] = None) -> Optional[Dict[str, Any]]:
        return self._get(f"/tv-shows/{tv_id}/seasons/{season_number}", country=country)

    def get_game(self, game_id: str) -> Optional[Dict[str, Any]]:
        return self._get(f"/games/{game_id}")

    def get_album(self, album_id: str) -> Optional[Dict[str, Any]]:
        return self._get(f"/albums/{album_id}")

    def get_book(self, book_id: str) -> Optional[Dict[str, Any]]:
        return self._get(f"/books/{book_id}")

    # ── Bulk endpoints (GET with ?ids=) ───────────────────────────────

    def get_bulk_movies(self, ids: List[str], country: Optional[str] = None) -> List[Dict[str, Any]]:
        return self._bulk("/movies/bulk", ids, country=country)

    def get_bulk_tv_shows(self, ids: List[str], country: Optional[str] = None) -> List[Dict[str, Any]]:
        return self._bulk("/tv-shows/bulk", ids, country=country)

    def get_bulk_games(self, ids: List[str]) -> List[Dict[str, Any]]:
        return self._bulk("/games/bulk", ids)

    def get_bulk_albums(self, ids: List[str]) -> List[Dict[str, Any]]:
        return self._bulk("/albums/bulk", ids)

    def get_bulk_books(self, ids: List[str]) -> List[Dict[str, Any]]:
        return self._bulk("/books/bulk", ids)

    def _bulk(
        self,
        path: str,
        ids: List[str],
        country: Optional[str] = None,
        chunk_size: int = 20,
    ) -> List[Dict[str, Any]]:
        if not ids:
            return []
        all_results: List[Dict[str, Any]] = []
        for i in range(0, len(ids), chunk_size):
            chunk = ids[i:i + chunk_size]
            ids_param = ",".join(str(id) for id in chunk)
            result = self._get(path, params={"ids": ids_param}, country=country, timeout=30)
            if isinstance(result, list):
                all_results.extend(result)
        return all_results

    # ── Search endpoints (query param is "q") ─────────────────────────

    def search_movies(self, q: str, page: int = 1, limit: int = 20) -> Optional[Dict[str, Any]]:
        return self._get("/movies", params={"q": q, "page": page, "limit": limit})

    def search_tv_shows(self, q: str, page: int = 1, limit: int = 20) -> Optional[Dict[str, Any]]:
        return self._get("/tv-shows", params={"q": q, "page": page, "limit": limit})

    def search_games(self, q: str, page: int = 1, limit: int = 20) -> Optional[Dict[str, Any]]:
        return self._get("/games", params={"q": q, "page": page, "limit": limit})

    def search_albums(self, q: str, page: int = 1, limit: int = 20) -> Optional[Dict[str, Any]]:
        return self._get("/albums", params={"q": q, "page": page, "limit": limit})

    def search_books(self, q: str, page: int = 1, limit: int = 20) -> Optional[Dict[str, Any]]:
        return self._get("/books", params={"q": q, "page": page, "limit": limit})

    # ── Trending endpoints ────────────────────────────────────────────

    def trending_movies(self, page: int = 1, limit: int = 20) -> Optional[Dict[str, Any]]:
        return self._get("/movies/trending", params={"page": page, "limit": limit})

    def trending_tv_shows(self, page: int = 1, limit: int = 20) -> Optional[Dict[str, Any]]:
        return self._get("/tv-shows/trending", params={"page": page, "limit": limit})

    def trending_games(self, page: int = 1, limit: int = 20) -> Optional[Dict[str, Any]]:
        return self._get("/games/trending", params={"page": page, "limit": limit})

    def trending_albums(self, page: int = 1, limit: int = 20) -> Optional[Dict[str, Any]]:
        return self._get("/albums/trending", params={"page": page, "limit": limit})

    def trending_books(self, page: int = 1, limit: int = 20) -> Optional[Dict[str, Any]]:
        return self._get("/books/trending", params={"page": page, "limit": limit})

    # ── Aggregate endpoints ───────────────────────────────────────────

    def search(self, q: str, page: int = 1, limit: int = 20, types: Optional[str] = None) -> Optional[Dict[str, Any]]:
        params: Dict[str, Any] = {"q": q, "page": page, "limit": limit}
        if types:
            params["types"] = types
        return self._get("/search", params=params)

    # ── Health ────────────────────────────────────────────────────────

    def health(self) -> Optional[Dict[str, Any]]:
        return self._get("/health", timeout=5)
