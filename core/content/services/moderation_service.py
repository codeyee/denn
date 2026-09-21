"""Deterministic per-item moderation classification service (JEV-003A).

Synchronous and side-effect bounded to one optional Jev call plus one
judgment write. Callable later by the JEV-003B backfill command and the
JEV-003C incremental ingestion hook. No scheduling, UI, API, or network
beyond the injected TypeSafe client.
"""
from __future__ import annotations

import logging

import time

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from typing import NamedTuple

from content.models import ContentItem, ContentModerationJudgment
from content.moderation.client import JevModerationClient
from content.moderation.errors import ModerationUnavailable
from content.moderation.policy import PolicyThresholds, compose_policy
from content.moderation.state import ModerationStateError, build_moderation_state
from content.services.payload_helpers import hash_payload
from content.services.payload_reconstructor import from_local

logger = logging.getLogger(__name__)


class ModerationClassificationOutcome(NamedTuple):
    """Typed non-row result for outcomes the judgment row cannot honestly hold."""

    kind: str  # "skipped" | "unavailable"
    code: str


def _provider_explicit(content_item: ContentItem) -> bool | None:
    """Return the affirmative SST adult flag, or None without any guesswork.

    Per the adult-safety boundary, only the TMDB normalized adult flag exists
    and is authoritative. IGDB, Spotify, and OpenLibrary expose no trustworthy
    equivalent, so any absent/unknown value stays None (never a false-negative
    certification of safety).
    """
    if content_item.source_api == ContentItem.SourceAPI.TMDB:
        payload = from_local(content_item)
        if payload is not None and payload.get("adult") is True:
            return True
    return None


def build_state_and_hash(content_item: ContentItem) -> tuple[dict, str]:
    """Return the normalized six-field text state and its canonical sha256."""
    payload = from_local(content_item)
    if not payload:
        logger.warning(
            'moderation_service: no persisted normalized detail for content_item=%s',
            content_item.id,
        )
        raise ModerationStateError(
            'moderation_state_unavailable for content_item=%s' % content_item.id
        )
    genres = payload.get('genres')
    tags = payload.get('tags')
    state = build_moderation_state(
        provider=content_item.source_api,
        content_type=content_item.content_type,
        title=payload.get('title'),
        description=payload.get('description'),
        genres=genres if isinstance(genres, list) else None,
        tags=tags if isinstance(tags, list) else None,
    )
    return state, hash_payload(state)


def classify_content_item(
    content_item: ContentItem,
    *,
    client: JevModerationClient | None = None,
    client_factory=None,
    model: str | None = None,
    thresholds: PolicyThresholds | None = None,
    settings_getter=None,
) -> ContentModerationJudgment | ModerationClassificationOutcome:
    """Classify one persisted `ContentItem` deterministically.

    Deterministic reuse: a complete judgment with the same persisted inference
    identity (model_name, question_revision, source_data_hash) is returned as
   -is with no extra Jev call. Any other identity triggers a new row.

    Provider explicit override (TMDB adult=True) short-circuits before any Jev
    call, persisting an honest judgment with no fabricated probabilities or
    usage - status COMPLETE, classification EXPLICIT, reason recorded.
    """
    settings_getter = settings_getter or _default_settings
    thresholds = thresholds or PolicyThresholds()

    if not settings_getter('MODERATION_CLASSIFICATION_ENABLED'):
        # Disabled mode: no client is constructed, no judgment is written.
        return ModerationClassificationOutcome('skipped', 'moderation_disabled')

    state, source_data_hash = build_state_and_hash(content_item)
    identity_kwargs = {
        'content_item': content_item,
        'source_data_hash': source_data_hash,
        'model_name': model or settings_getter('MODERATION_MODEL'),
        'question_revision': settings_getter('MODERATION_QUESTION_REVISION'),
    }
    existing = (
        ContentModerationJudgment.objects.filter(
            status=ContentModerationJudgment.Status.COMPLETE,
            **identity_kwargs,
        )
        .order_by('-requested_at')
        .first()
    )
    if existing is not None:
        return existing

    provider_explicit = _provider_explicit(content_item)
    if provider_explicit is True:
        with transaction.atomic():
            judgment = ContentModerationJudgment.objects.create(**identity_kwargs)
            judgment.status = ContentModerationJudgment.Status.COMPLETE
            judgment.classification = (
                ContentModerationJudgment.Classification.EXPLICIT
            )
            judgment.payload = {
                'provider_explicit': True,
                'policy': {
                    'decision': 'explicit_or_sensitive',
                    'reason': 'provider_explicit_override',
                },
                'raw_nouls': {},  # honest: no Jev call was made
                'usage': {'input_tokens': None, 'output_tokens': None},
                'source_state': state,
            }
            judgment.completed_at = timezone.now()
            judgment.save()
        return judgment

    with transaction.atomic():
        judgment = ContentModerationJudgment.objects.create(**identity_kwargs)
    model_name = identity_kwargs['model_name']
    started = time.monotonic()
    try:
        adapter = client or JevModerationClient(
            client_factory=client_factory,
            model=model_name,
            settings_getter=settings_getter,
        )
        moderation_judgment = adapter.classify(state)
    except ModerationUnavailable as error:
        judgment.status = ContentModerationJudgment.Status.ERROR
        judgment.error_code = error.code
        judgment.save(update_fields=['status', 'error_code'])
        return ModerationClassificationOutcome('unavailable', error.code)

    policy_result = compose_policy(
        provider_explicit,
        moderation_judgment.nouls.get('safe_for_automatic_discovery'),
        moderation_judgment.nouls.get('explicit_or_sensitive'),
        moderation_judgment.nouls.get('needs_review'),
        thresholds=thresholds,
    )

    with transaction.atomic():
        judgment.payload = {
            'raw_nouls': dict(moderation_judgment.nouls),
            'model': moderation_judgment.model,
            'classification_ms': round((time.monotonic() - started) * 1000),
            'usage': {
                'input_tokens': moderation_judgment.usage.input_tokens,
                'output_tokens': moderation_judgment.usage.output_tokens,
            },
            'policy': {
                'decision': policy_result.decision,
                'reason': policy_result.reason,
            },
            'policy_thresholds': {
                'safe_min': thresholds.safe_min,
                'explicit_at': thresholds.explicit_at,
                'review_at': thresholds.review_at,
            },
            'source_state': state,
            'provider_explicit': provider_explicit,
        }
        judgment.status = ContentModerationJudgment.Status.COMPLETE
        judgment.classification = _map_decision(policy_result.decision)
        judgment.completed_at = timezone.now()
        judgment.save()
    return judgment


def _map_decision(decision: str) -> str:
    return {
        'safe_for_automatic_discovery': ContentModerationJudgment.Classification.SAFE,
        'explicit_or_sensitive': ContentModerationJudgment.Classification.EXPLICIT,
        'needs_review': ContentModerationJudgment.Classification.NEEDS_REVIEW,
        'unknown': ContentModerationJudgment.Classification.UNKNOWN,
    }[decision]


def _default_settings(name):
    return getattr(settings, name)
