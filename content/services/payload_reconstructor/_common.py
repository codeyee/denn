"""Helpers shared across reconstructors."""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional

from content.models import ContentItem, Image, StreamingPlatform


def serialize_release_date(value) -> Optional[str]:
    """Render a Python `date` back to the proxy's ISO `YYYY-MM-DD` string."""
    if not value:
        return None
    try:
        return value.isoformat()
    except AttributeError:
        return None


def serialize_authors(content_item: ContentItem) -> List[Dict[str, str]]:
    """Recreate the proxy `authors` array from ContentItemAuthor rows.

    Relies on `ContentItemAuthor.Meta.ordering` so an existing
    `prefetch_related('content_authors__author')` cache is reused
    instead of triggering a fresh query.
    """
    rows = content_item.content_authors.all()
    return [
        {'name': r.author.name, 'type': r.role}
        for r in rows
    ]


def serialize_images(images: Iterable[Image]) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    for img in images:
        out.append({'type': img.type, 'size': img.size, 'image_url': img.image_url})
    return out


def serialize_streaming_platforms(
    rows: Iterable[StreamingPlatform],
    *,
    request_country: Optional[str] = None,
) -> Optional[Dict[str, List[Dict[str, str]]]]:
    """Re-group `StreamingPlatform` rows back into `{kind: [Platform]}`.

    If `request_country` is provided we only include rows for that
    country; otherwise we use the union of every country we have rows
    for. The result is `None` if there are no platform rows at all
    (proxy uses an absent key rather than an empty object).
    """
    grouped: Dict[str, List[Dict[str, str]]] = {}
    for row in rows:
        if request_country and row.country_code and row.country_code != request_country:
            continue
        bucket = grouped.setdefault(row.kind, [])
        entry: Dict[str, str] = {'name': row.name}
        if row.image_url:
            entry['image_url'] = row.image_url
        bucket.append(entry)
    if not grouped:
        return None
    return grouped


def drop_none(d: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None and v != ''}
