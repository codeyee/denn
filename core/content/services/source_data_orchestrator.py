"""Local-first read path for proxy-shaped source data (Sprint 07 / PR-7B).

`fetch_bulk_source_data` is the canonical entry point: it classifies each
item as `fresh_local`, `stale_local`, or `missing` and only pays the
proxy round-trip for the latter two. Stale items that fail to refresh
fall back to their local copy with `is_stale=True`.

The legacy `content.utils.bulk_fetch_source_data` shim was removed in
Sprint 07 / PR-7E — import this module directly.
"""
from __future__ import annotations

import logging
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional

from django.conf import settings

from content.models import ContentItem
from core.middleware.perf_timing import (
    perf_record_data_source,
    perf_record_proxy_batch,
)

from .local_content_store import detail_is_fresh
from .local_content_store.mappers import MAPPERS
from . import payload_reconstructor


logger = logging.getLogger(__name__)


_DETAIL_RELATED_NAMES = (
    'movie_detail',
    'tv_show_detail',
    'season_detail',
    'album_detail',
    'game_detail',
    'book_detail',
)


def _hydrate_details(items: List[ContentItem]) -> List[ContentItem]:
    """Return the input items refetched with all Detail relations selected."""
    if not items:
        return items
    ids = [i.id for i in items]
    qs = (
        ContentItem.objects
        .filter(id__in=ids)
        .select_related(*_DETAIL_RELATED_NAMES)
        .prefetch_related(
            'images',
            'streaming_platforms',
            'content_authors__author',
            'season_detail__episodes',
            'album_detail__tracks__track_authors__author',
            'game_detail__genres',
            'game_detail__themes',
            'game_detail__game_modes',
            'game_detail__platforms',
        )
    )
    by_id = {i.id: i for i in qs}
    return [by_id[i.id] for i in items if i.id in by_id]


def _classify(items: List[ContentItem]) -> Dict[str, List[ContentItem]]:
    fresh: List[ContentItem] = []
    stale: List[ContentItem] = []
    missing: List[ContentItem] = []
    force = bool(getattr(settings, 'FORCE_PROXY_FETCH', False))

    for item in items:
        from .local_content_store import detail_for
        detail = detail_for(item)
        if force:
            (stale if detail else missing).append(item)
            continue
        if detail is None:
            missing.append(item)
        elif detail_is_fresh(item):
            fresh.append(item)
        else:
            stale.append(item)
    return {'fresh': fresh, 'stale': stale, 'missing': missing}


def _proxy_fetch(items: List[ContentItem], country_code: Optional[str]) -> Dict[int, Optional[Dict[str, Any]]]:
    """Defer to the existing proxy bulk helpers in `content.utils`."""
    if not items:
        return {}
    from content.utils import (
        _bulk_fetch_igdb,
        _bulk_fetch_openlibrary,
        _bulk_fetch_spotify,
        _bulk_fetch_tmdb,
    )

    grouped: Dict[str, List[ContentItem]] = defaultdict(list)
    for item in items:
        grouped[item.source_api].append(item)

    out: Dict[int, Optional[Dict[str, Any]]] = {}
    started = time.monotonic()
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = []
        if ContentItem.SourceAPI.TMDB in grouped:
            futures.append(executor.submit(_bulk_fetch_tmdb, grouped[ContentItem.SourceAPI.TMDB], country_code))
        if ContentItem.SourceAPI.IGDB in grouped:
            futures.append(executor.submit(_bulk_fetch_igdb, grouped[ContentItem.SourceAPI.IGDB]))
        if ContentItem.SourceAPI.SPOTIFY in grouped:
            futures.append(executor.submit(_bulk_fetch_spotify, grouped[ContentItem.SourceAPI.SPOTIFY]))
        if ContentItem.SourceAPI.OPENLIBRARY in grouped:
            futures.append(executor.submit(_bulk_fetch_openlibrary, grouped[ContentItem.SourceAPI.OPENLIBRARY]))

        for future in as_completed(futures):
            try:
                out.update(future.result())
            except Exception:
                logger.warning('proxy_fetch_partition_failed', exc_info=True)
    perf_record_proxy_batch(
        _proxy_call_count(items),
        time.monotonic() - started,
    )
    return out


def _proxy_call_count(items: List[ContentItem]) -> int:
    """Count actual bulk/detail HTTP calls issued by the partition helpers."""
    content_types = {item.content_type for item in items}
    count = int(ContentItem.ContentType.MOVIE in content_types)
    count += int(ContentItem.ContentType.TV_SHOW in content_types)
    count += sum(
        1
        for item in items
        if item.content_type == ContentItem.ContentType.SEASON
        and len(item.external_id.split(":")) == 2
    )
    count += int(any(item.source_api == ContentItem.SourceAPI.IGDB for item in items))
    count += int(
        any(item.source_api == ContentItem.SourceAPI.SPOTIFY for item in items)
    )
    count += int(
        any(item.source_api == ContentItem.SourceAPI.OPENLIBRARY for item in items)
    )
    return count


def _persist(item: ContentItem, payload: Dict[str, Any], request_country: Optional[str]) -> None:
    mapper = MAPPERS.get(item.content_type)
    if not mapper:
        return
    try:
        mapper(item, payload, request_country=request_country)
    except Exception:
        logger.exception('orchestrator_mapper_failed', extra={'content_item_id': item.id})


def fetch_bulk_source_data(
    content_items: List[ContentItem],
    country_code: Optional[str] = None,
) -> Dict[int, Dict[str, Any]]:
    """Local-first replacement for `bulk_fetch_source_data`.

    Returns `{content_item.id: source_data_dict}`. Items whose payload
    came from a stale local row that we couldn't refresh include
    `'is_stale': True`.
    """
    if not content_items:
        return {}
    started = time.monotonic()

    items = _hydrate_details(list(content_items))
    classified = _classify(items)
    fresh_items = classified['fresh']
    stale_items = classified['stale']
    missing_items = classified['missing']
    perf_record_data_source(
        fresh=len(fresh_items),
        stale=len(stale_items),
        missing=len(missing_items),
        provider_fetches=len(stale_items) + len(missing_items),
    )

    results: Dict[int, Dict[str, Any]] = {}
    proxy_calls = 0

    for item in fresh_items:
        payload = payload_reconstructor.from_local(item)
        if payload is not None:
            results[item.id] = payload

    refreshed_ids: List[int] = []

    needs_proxy = stale_items + missing_items
    if needs_proxy:
        proxy_calls = _proxy_call_count(needs_proxy)
        proxy_results = _proxy_fetch(needs_proxy, country_code)
        stale_id_set = {i.id for i in stale_items}
        persisted: List[ContentItem] = []
        for item in needs_proxy:
            payload = proxy_results.get(item.id)
            if payload:
                _persist(item, payload, country_code)
                refreshed_ids.append(item.id)
                persisted.append(item)
            elif item.id in stale_id_set:
                fallback = payload_reconstructor.from_local(item)
                if fallback is not None:
                    fallback['is_stale'] = True
                    results[item.id] = fallback

        # Re-hydrate just the items we wrote so the reconstructor sees
        # the new Detail rows (the original instances still hold the
        # pre-persist select_related cache).
        if persisted:
            rebuilt_items = _hydrate_details(persisted)
            for item in rebuilt_items:
                rebuilt = payload_reconstructor.from_local(item)
                if rebuilt is not None:
                    results[item.id] = rebuilt
                elif proxy_results.get(item.id):
                    results[item.id] = proxy_results[item.id]

    elapsed_ms = int((time.monotonic() - started) * 1000)
    logger.info(
        'orchestrator_summary',
        extra={
            'event': 'orchestrator',
            'total': len(items),
            'fresh': len(fresh_items),
            'stale': len(stale_items),
            'missing': len(missing_items),
            'proxy_calls': proxy_calls,
            'latency_ms': elapsed_ms,
        },
    )

    # Refresh browse_meta only for items we actually rebuilt from a fresh
    # proxy payload. Fresh-local items already have correct browse_meta
    # because the previous ingest wrote it; re-upserting on every read
    # would be 4 extra queries per item.
    if refreshed_ids:
        try:
            from .browse_metadata_service import upsert_many
            refreshed_set = set(refreshed_ids)
            upsert_many(
                [i for i in items if i.id in refreshed_set],
                {i: results[i] for i in refreshed_ids if i in results},
            )
        except Exception:
            logger.warning('orchestrator_browse_meta_refresh_failed', exc_info=True)

    return results


__all__ = ['fetch_bulk_source_data']
