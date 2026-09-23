"""Materialize moderation freshness from Core's normalized detail rows."""
from __future__ import annotations

from content.models import ContentItem, TvShowDetail
from content.moderation.state import (
    ModerationStateError,
    build_moderation_state,
    hash_moderation_state,
)
from content.services import payload_reconstructor


def current_moderation_source_hash(content_item: ContentItem) -> str | None:
    """Return the canonical hash for persisted normalized moderation text."""
    payload = payload_reconstructor.from_local(content_item)
    if payload is None:
        return None
    state = build_moderation_state(
        provider=content_item.source_api,
        content_type=content_item.content_type,
        reconstructed_payload=payload,
    )
    return hash_moderation_state(state)


def persist_current_moderation_source_hash(content_item: ContentItem) -> str | None:
    """Persist a current hash, or clear it when normalized state is unavailable."""
    try:
        source_hash = current_moderation_source_hash(content_item)
    except (ModerationStateError, TypeError, ValueError):
        source_hash = None
    ContentItem.objects.filter(pk=content_item.pk).update(
        current_moderation_source_hash=source_hash,
    )
    content_item.current_moderation_source_hash = source_hash
    return source_hash


def upsert_detail_with_moderation_hash(
    content_item: ContentItem,
    payload: dict,
    mapper,
    *,
    request_country: str | None = None,
) -> None:
    """Atomically write normalized details and their matching current hash.

    TV-show names can contribute to season state when a season has no local
    show name. On a parent-name change, invalidate only those dependent rows;
    nested season upserts repopulate their hashes after the new parent is saved.
    """
    from django.db import transaction

    with transaction.atomic():
        locked_item = ContentItem.objects.select_for_update().get(pk=content_item.pk)
        if locked_item.content_type == ContentItem.ContentType.TV_SHOW:
            _invalidate_dependent_seasons_on_parent_name_change(locked_item, payload)
        mapper(content_item, payload, request_country=request_country)
        persisted_item = ContentItem.objects.get(pk=content_item.pk)
        persist_current_moderation_source_hash(persisted_item)
        content_item.current_moderation_source_hash = (
            persisted_item.current_moderation_source_hash
        )


def _invalidate_dependent_seasons_on_parent_name_change(
    tv_show: ContentItem,
    payload: dict,
) -> None:
    previous_name = TvShowDetail.objects.filter(content_item=tv_show).values_list(
        "title", flat=True
    ).first()
    next_name = payload.get("title") or ""
    if previous_name == next_name:
        return
    ContentItem.objects.filter(
        content_type=ContentItem.ContentType.SEASON,
        season_detail__tv_show_id=tv_show.pk,
        season_detail__tv_show_name="",
    ).update(current_moderation_source_hash=None)
