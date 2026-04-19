"""Reconstruct a book payload from BookDetail + child rows."""
from __future__ import annotations

from typing import Any, Dict, Optional

from content.models import ContentItem

from ._common import (
    serialize_authors,
    serialize_images,
    serialize_release_date,
)


def from_local(content_item: ContentItem, *, request_country: Optional[str] = None) -> Optional[Dict[str, Any]]:
    detail = getattr(content_item, 'book_detail', None)
    if detail is None:
        try:
            from content.models import BookDetail
            detail = BookDetail.objects.get(content_item=content_item)
        except Exception:
            return None

    payload: Dict[str, Any] = {
        'id': content_item.external_id,
        'type': 'book',
        'title': detail.title,
    }

    if detail.image_url:
        payload['image_url'] = detail.image_url
    rd = serialize_release_date(detail.release_date)
    if rd:
        payload['release_date'] = rd
    if detail.pages is not None:
        payload['pages'] = detail.pages
    if detail.description:
        payload['description'] = detail.description

    authors = serialize_authors(content_item)
    if authors:
        payload['authors'] = authors

    images = serialize_images(content_item.images.all())
    if images:
        payload['images'] = images

    return payload
