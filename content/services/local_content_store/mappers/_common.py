"""Helpers shared by the per-content-type mappers.

Kept here (rather than in `services/payload_helpers`) because they only
make sense once we're writing to the local Detail tables.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Iterable, List, Optional

from django.conf import settings
from django.db import IntegrityError
from django.utils.text import slugify

from content.models import (
    Author,
    ContentItem,
    ContentItemAuthor,
    GameMode,
    Genre,
    Image,
    StreamingPlatform,
    Theme,
)


logger = logging.getLogger(__name__)


def require_payload_shape(payload: Dict[str, Any], expected_type: str) -> None:
    """Hard-fail if `payload` is missing `id` or has the wrong `type`.

    Mappers tolerate every other missing field (we'd rather store a
    half-baked Detail than crash a request), but `id` and `type` are
    contract-level invariants we need to trust.
    """
    if not isinstance(payload, dict):
        raise ValueError('payload must be a dict')
    if not payload.get('id'):
        raise ValueError('payload missing id')
    payload_type = payload.get('type')
    if payload_type and payload_type != expected_type:
        raise ValueError(
            f'payload type mismatch: expected {expected_type!r}, got {payload_type!r}'
        )


def replace_images(content_item: ContentItem, payload: Dict[str, Any]) -> None:
    """Wipe + recreate Image rows for `content_item` from the proxy `images` array."""
    raw = payload.get('images') or []
    Image.objects.filter(content_item=content_item).delete()
    rows: List[Image] = []
    for idx, entry in enumerate(raw):
        if not isinstance(entry, dict):
            continue
        url = entry.get('image_url')
        if not url:
            continue
        rows.append(
            Image(
                content_item=content_item,
                type=entry.get('type') or Image.Type.POSTER,
                size=entry.get('size') or Image.Size.STANDARD,
                image_url=url,
                position=idx,
            )
        )
    if rows:
        Image.objects.bulk_create(rows)


def replace_streaming_platforms(
    content_item: ContentItem,
    payload: Dict[str, Any],
    *,
    request_country: Optional[str],
) -> None:
    """Flatten `payload['platforms']` (`{kind: [Platform]}`) into rows for `country_code`."""
    country = (request_country or getattr(settings, 'DEFAULT_COUNTRY', '') or '').upper()
    raw = payload.get('platforms')
    if not isinstance(raw, dict):
        StreamingPlatform.objects.filter(
            content_item=content_item, country_code=country
        ).delete()
        return

    StreamingPlatform.objects.filter(
        content_item=content_item, country_code=country
    ).delete()

    rows: List[StreamingPlatform] = []
    for kind, entries in raw.items():
        if kind not in StreamingPlatform.Kind.values:
            continue
        if not isinstance(entries, list):
            continue
        seen = set()
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            name = entry.get('name')
            if not name:
                continue
            key = (kind, name)
            if key in seen:
                continue
            seen.add(key)
            rows.append(
                StreamingPlatform(
                    content_item=content_item,
                    kind=kind,
                    name=name,
                    image_url=entry.get('image_url') or '',
                    country_code=country,
                )
            )
    if rows:
        StreamingPlatform.objects.bulk_create(rows)


def _get_or_create_author(name: str) -> Author:
    # Author identity lives in `slug` (unique, lowercase, slugified). Looking up by `name`
    # was case-sensitive and exploded with IntegrityError when payloads brought the same
    # entity with different casing/punctuation (e.g. "CD Projekt Red" vs "CD PROJEKT RED").
    slug = slugify(name)[:255] or name[:255]
    author = Author.objects.filter(slug=slug).first()
    if author:
        return author
    try:
        return Author.objects.create(name=name, slug=slug)
    except IntegrityError:
        return Author.objects.get(slug=slug)


def replace_content_item_authors(
    content_item: ContentItem,
    payload: Dict[str, Any],
) -> None:
    """Replace ContentItemAuthor rows from `payload['authors']` (proxy shape)."""
    raw = payload.get('authors') or []
    ContentItemAuthor.objects.filter(content_item=content_item).delete()
    if not isinstance(raw, list):
        return
    seen = set()
    for idx, entry in enumerate(raw):
        if isinstance(entry, dict):
            name = entry.get('name')
            role = entry.get('type') or ''
        elif isinstance(entry, str):
            name = entry
            role = ''
        else:
            continue
        if not name:
            continue
        key = (name, role)
        if key in seen:
            continue
        seen.add(key)
        author = _get_or_create_author(name)
        ContentItemAuthor.objects.create(
            content_item=content_item,
            author=author,
            role=role,
            position=idx,
        )


def _ensure_named(model_cls, names: Iterable[str]):
    out = []
    for name in names:
        if not name:
            continue
        instance, _ = model_cls.objects.get_or_create(name=name)
        out.append(instance)
    return out


def sync_game_taxonomies(game_detail, payload: Dict[str, Any]) -> None:
    """Replace `genres / themes / game_modes` M2M for a game from payload lists."""
    raw_genres = payload.get('genres') or []
    raw_themes = payload.get('themes') or []
    raw_modes = payload.get('game_modes') or []

    if isinstance(raw_genres, list):
        game_detail.genres.set(_ensure_named(Genre, [g for g in raw_genres if isinstance(g, str)]))
    if isinstance(raw_themes, list):
        game_detail.themes.set(_ensure_named(Theme, [t for t in raw_themes if isinstance(t, str)]))
    if isinstance(raw_modes, list):
        game_detail.game_modes.set(_ensure_named(GameMode, [m for m in raw_modes if isinstance(m, str)]))
