import logging
import os
import re
import time
from typing import Optional, Dict, Any, List

import requests
from django.conf import settings

from core.middleware.perf_timing import perf_record_proxy_call
from core.middleware.request_id import get_current_request_id

logger = logging.getLogger(__name__)


def _env_int(name: str, default: int) -> int:
    """Read a positive int from env, falling back to ``default`` on errors."""
    raw = os.getenv(name)
    if not raw:
        return default
    try:
        value = int(raw)
        return value if value > 0 else default
    except ValueError:
        return default


DEFAULT_TIMEOUT = _env_int("PROXY_GET_TIMEOUT", 15)
BULK_TIMEOUT = _env_int("PROXY_BULK_TIMEOUT", 30)


def _bounded_path(path: str) -> str:
    """Collapse provider identifiers so log labels stay low-cardinality."""
    return re.sub(
        r"^/(movies|tv-shows|games|albums|books)/[^/]+",
        r"/\1/:id",
        path,
    )


def _bounded_cache_status(value: Optional[str]) -> Optional[str]:
    normalized = value.strip().upper() if value else ""
    return normalized if normalized in {"HIT", "MISS", "STALE", "BYPASS"} else None


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
        self._session.headers.update(
            {"X-Api-Key": self.api_key, "X-Api-Consumer": "core"}
        )

    def _headers(self, country: Optional[str] = None) -> Dict[str, str]:
        headers: Dict[str, str] = {}
        if country:
            headers["X-User-Country"] = country
        request_id = get_current_request_id()
        if request_id:
            headers["X-Request-Id"] = request_id
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

        # Sprint 08 / T1: record per-call wall time even on failure so the
        # request-level perf log captures every proxy hop, not just the
        # successful ones. The thread-local counter is a no-op outside an
        # instrumented request.
        started = time.perf_counter()
        status_code = None
        cache_status = None
        try:
            resp = self._session.get(
                url,
                params=params,
                headers=self._headers(country),
                timeout=timeout,
            )
            status_code = resp.status_code
            cache_status = _bounded_cache_status(resp.headers.get("X-Cache"))
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as e:
            logger.warning(
                "proxy_api_http_error",
                extra={
                    "path": _bounded_path(path),
                    "error_type": type(e).__name__,
                    "status": status_code,
                },
            )
            return None
        except requests.exceptions.RequestException as e:
            logger.error(
                "proxy_api_request_failed",
                extra={
                    "path": _bounded_path(path),
                    "error_type": type(e).__name__,
                },
            )
            return None
        finally:
            duration_seconds = time.perf_counter() - started
            perf_record_proxy_call(duration_seconds)
            logger.info(
                "outbound_http_request",
                extra={
                    "target_service": "proxy",
                    "path": _bounded_path(path),
                    "status": status_code,
                    "duration_ms": round(duration_seconds * 1000.0, 2),
                    "cache_status": cache_status,
                },
            )

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
            result = self._get(path, params={"ids": ids_param}, country=country, timeout=BULK_TIMEOUT)
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
