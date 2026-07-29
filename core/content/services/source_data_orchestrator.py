"""Local-first read path for proxy-shaped source data (Sprint 07 / PR-7B).

`fetch_bulk_source_data` is the canonical entry point: it classifies each
item as `fresh_local`, `stale_local`, or `missing`. Canonical detail
reads serve stale rows immediately and schedule a bounded background
refresh; callers can still request synchronous stale refresh explicitly.

The legacy `content.utils.bulk_fetch_source_data` shim was removed in
Sprint 07 / PR-7E — import this module directly.
"""
from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.db import close_old_connections

from content.models import ContentItem
from core.middleware.perf_timing import (
    perf_record_data_source,
    perf_record_proxy_batch,
)

from .local_content_store import detail_is_complete, detail_is_fresh
from .local_content_store.mappers import MAPPERS
from . import payload_reconstructor


logger = logging.getLogger(__name__)
_refresh_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix='source-data-refresh')
_refresh_lock = threading.Lock()
_refreshing_ids: set[int] = set()


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
    prefetches = [
        'images',
        'streaming_platforms',
        'content_authors__author',
        'season_detail__episodes',
        'season_children__content_item',
        'album_detail__tracks__track_authors__author',
        'game_detail__genres',
        'game_detail__themes',
        'game_detail__game_modes',
        'game_detail__platforms',
    ]
    if any(item.content_type == ContentItem.ContentType.GAME for item in items):
        prefetches.append('game_duration_estimates')

    qs = (
        ContentItem.objects
        .filter(id__in=ids)
        .select_related(*_DETAIL_RELATED_NAMES)
        .prefetch_related(*prefetches)
    )
    by_id = {i.id: i for i in qs}
    return [by_id[i.id] for i in items if i.id in by_id]


def _mark_stale(payload: Dict[str, Any]) -> Dict[str, Any]:
    payload['is_stale'] = True
    duration = payload.get('duration')
    if isinstance(duration, dict) and duration.get('status') == 'matched':
        payload['duration'] = {**duration, 'status': 'stale'}
    return payload


def _classify(items: List[ContentItem]) -> Dict[str, List[ContentItem]]:
    fresh: List[ContentItem] = []
    stale: List[ContentItem] = []
    missing: List[ContentItem] = []
    incomplete: List[ContentItem] = []
    force = bool(getattr(settings, 'FORCE_PROXY_FETCH', False))

    for item in items:
        from .local_content_store import detail_for
        detail = detail_for(item)
        if force:
            (stale if detail else missing).append(item)
            continue
        if detail is None:
            missing.append(item)
        elif not detail_is_complete(item):
            incomplete.append(item)
        elif detail_is_fresh(item):
            fresh.append(item)
        else:
            stale.append(item)
    return {
        'fresh': fresh,
        'stale': stale,
        'missing': missing,
        'incomplete': incomplete,
    }


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


def _refresh_stale_items(item_ids: tuple[int, ...], country_code: Optional[str]) -> None:
    close_old_connections()
    try:
        items = list(ContentItem.objects.filter(id__in=item_ids))
        fetch_bulk_source_data(items, country_code=country_code)
    except Exception:
        logger.exception(
            'orchestrator_background_refresh_failed',
            extra={'content_item_ids': item_ids},
        )
    finally:
        close_old_connections()
        with _refresh_lock:
            _refreshing_ids.difference_update(item_ids)


def _schedule_stale_refresh(
    items: List[ContentItem],
    country_code: Optional[str],
) -> int:
    scheduled: list[int] = []
    with _refresh_lock:
        for item in items:
            if item.id not in _refreshing_ids:
                _refreshing_ids.add(item.id)
                scheduled.append(item.id)
    if scheduled:
        _refresh_executor.submit(
            _refresh_stale_items,
            tuple(scheduled),
            country_code,
        )
    return len(scheduled)


def fetch_bulk_source_data(
    content_items: List[ContentItem],
    country_code: Optional[str] = None,
    *,
    stale_while_revalidate: bool = False,
) -> Dict[int, Dict[str, Any]]:
    """Local-first replacement for `bulk_fetch_source_data`.

    Returns `{content_item.id: source_data_dict}`. Items whose payload
    came from a stale local row include `'is_stale': True`.
    """
    if not content_items:
        return {}
    started = time.monotonic()

    items = _hydrate_details(list(content_items))
    classified = _classify(items)
    fresh_items = classified['fresh']
    stale_items = classified['stale']
    missing_items = classified['missing']
    incomplete_items = classified['incomplete']
    synchronous_provider_items = (
        missing_items
        + incomplete_items
        + ([] if stale_while_revalidate else stale_items)
    )
    perf_record_data_source(
        fresh=len(fresh_items),
        stale=len(stale_items),
        missing=len(missing_items) + len(incomplete_items),
        provider_fetches=len(synchronous_provider_items),
    )

    results: Dict[int, Dict[str, Any]] = {}
    proxy_calls = 0

    for item in fresh_items:
        payload = payload_reconstructor.from_local(item)
        if payload is not None:
            results[item.id] = payload

    scheduled_refreshes = 0
    if stale_while_revalidate:
        for item in stale_items:
            payload = payload_reconstructor.from_local(item)
            if payload is not None:
                results[item.id] = _mark_stale(payload)
        scheduled_refreshes = _schedule_stale_refresh(stale_items, country_code)

    refreshed_ids: List[int] = []

    needs_proxy = synchronous_provider_items
    if needs_proxy:
        proxy_calls = _proxy_call_count(needs_proxy)
        proxy_results = _proxy_fetch(needs_proxy, country_code)
        fallback_id_set = {i.id for i in stale_items + incomplete_items}
        persisted: List[ContentItem] = []
        for item in needs_proxy:
            payload = proxy_results.get(item.id)
            if payload:
                _persist(item, payload, country_code)
                refreshed_ids.append(item.id)
                persisted.append(item)
            elif item.id in fallback_id_set:
                fallback = payload_reconstructor.from_local(item)
                if fallback is not None:
                    results[item.id] = _mark_stale(fallback)

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
            'scheduled_refreshes': scheduled_refreshes,
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
