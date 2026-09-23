"""Deterministic per-item moderation classification service (JEV-003A).

Synchronous and side-effect bounded to one optional Jev call plus one
judgment write. Callable later by the JEV-003B backfill command and the
JEV-003C incremental ingestion hook. No scheduling, UI, API, or network
beyond the injected TypeSafe client.
"""
from __future__ import annotations

import logging

import time

import hashlib
import json

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from typing import NamedTuple

from content.models import ContentItem, ContentModerationJudgment
from content.moderation.client import JevModerationClient
from content.moderation.errors import ModerationUnavailable
from content.moderation.policy import PolicyThresholds, compose_policy
from content.moderation.state import ModerationStateError, build_moderation_state
from content.services.payload_reconstructor import from_local

logger = logging.getLogger(__name__)

PROVIDER_RULE_MODEL = 'provider-rule:v1'
_KNOWN_ALIASES = {'jev-latest'}


class ModerationClassificationOutcome(NamedTuple):
    """Typed non-row result for outcomes the judgment row cannot honestly hold."""

    kind: str  # "skipped" | "unavailable"
    code: str


def _observe(observation, *, reused: bool, called: bool, usage: dict | None) -> None:
    """Record one invocation's facts on the caller's optional observation dict.

    Callers need three separate facts: whether an existing judgment was reused,
    whether a remote Jev call actually happened, and which usage belongs to the
    current call. A remote call can collapse onto an existing row, so `reused`
    and `called` are independent, and `usage` always describes this invocation.
    """
    if observation is None:
        return
    observation['reused'] = reused
    observation['called'] = called
    observation['usage'] = usage


def _current_usage(moderation_judgment) -> dict:
    """Return this call's token usage, with None fields when it went unreported.

    Always returns a dict so a response that omits usage entirely is reported
    the same way as one that reports no tokens: both mean "no attributable
    usage for this call" to the caller.
    """
    usage = getattr(moderation_judgment, 'usage', None)
    return {
        'input_tokens': getattr(usage, 'input_tokens', None),
        'output_tokens': getattr(usage, 'output_tokens', None),
    }


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
    canonical = json.dumps(state, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    return state, hashlib.sha256(canonical.encode('utf-8')).hexdigest()


def classify_content_item(
    content_item: ContentItem,
    *,
    client: JevModerationClient | None = None,
    client_factory=None,
    model: str | None = None,
    thresholds: PolicyThresholds | None = None,
    settings_getter=None,
    observation: dict | None = None,
) -> ContentModerationJudgment | ModerationClassificationOutcome:
    """Classify one persisted `ContentItem` deterministically.

    Deterministic reuse: a complete judgment with the same persisted inference
    identity (model_name, question_revision, source_data_hash) is returned as
   -is with no extra Jev call. Any other identity triggers a new row.

    Provider explicit override (TMDB adult=True) short-circuits before any Jev
    call, persisting an honest judgment with no fabricated probabilities or
    usage - status COMPLETE, classification EXPLICIT, reason recorded.

    `observation` is an optional caller-owned dict filled in place with the
    invocation facts `reused`, `called`, and `usage`. It is only written when
    supplied, so existing callers are unaffected. `usage` is always the current
    call's usage, including when that call collapsed onto an existing row. It is
    a dict whenever a remote call happened and None whenever none did, so the
    two cases stay distinguishable without inspecting token values.
    """
    settings_getter = settings_getter or _default_settings
    thresholds = thresholds or PolicyThresholds()

    if not settings_getter('MODERATION_CLASSIFICATION_ENABLED'):
        # Disabled mode: no client is constructed, no judgment is written.
        _observe(observation, reused=False, called=False, usage=None)
        return ModerationClassificationOutcome('skipped', 'moderation_disabled')

    try:
        state, source_data_hash = build_state_and_hash(content_item)
    except ModerationStateError:
        # Typed unavailable outcome, zero calls, zero writes, no exception.
        _observe(observation, reused=False, called=False, usage=None)
        return ModerationClassificationOutcome('skipped', 'state_unavailable')

    requested_model = model or settings_getter('MODERATION_MODEL')
    question_revision = settings_getter('MODERATION_QUESTION_REVISION')

    provider_explicit = _provider_explicit(content_item)
    if provider_explicit is True:
        payload = {
            'provider_explicit': True,
            'requested_model': requested_model,
            'policy': {
                'decision': 'explicit_or_sensitive',
                'reason': 'provider_explicit_override',
            },
            'raw_nouls': {},  # honest: no Jev call was made
            'usage': {'input_tokens': None, 'output_tokens': None},
            'source_state': state,
        }
        judgment, _created = _get_or_create_judgment(
            model_name=PROVIDER_RULE_MODEL,
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.EXPLICIT,
            payload=payload,
            content_item=content_item,
            source_data_hash=source_data_hash,
            question_revision=question_revision,
        )
        _observe(observation, reused=not _created, called=False, usage=None)
        return judgment

    # Alias requested (or unset): no safe pre-reuse without resolved model.
    allow_pre_reuse = requested_model not in _KNOWN_ALIASES
    if allow_pre_reuse:
        existing = (
            ContentModerationJudgment.objects.filter(
                status=ContentModerationJudgment.Status.COMPLETE,
                model_name=requested_model,
                content_item=content_item,
                source_data_hash=source_data_hash,
                question_revision=question_revision,
            )
            .order_by('-requested_at')
            .first()
        )
        if existing is not None:
            _observe(observation, reused=True, called=False, usage=None)
            return existing

    started = time.monotonic()
    try:
        adapter = client or JevModerationClient(
            client_factory=client_factory,
            model=requested_model,
            settings_getter=settings_getter,
        )
        moderation_judgment = adapter.classify(state)
    except ModerationUnavailable as error:
        # No ERROR row is persisted here: typed honest outcome for JEV-003B.
        _observe(observation, reused=False, called=False, usage=None)
        return ModerationClassificationOutcome('unavailable', error.code)

    resolved_model = moderation_judgment.model
    if not isinstance(resolved_model, str) or not resolved_model.strip():
        _observe(observation, reused=False, called=True, usage=None)
        return ModerationClassificationOutcome(
            'unavailable', 'typesafe_response_invalid'
        )
    resolved_model = moderation_judgment.model.strip()

    current_usage = _current_usage(moderation_judgment)

    policy_result = compose_policy(
        provider_explicit,
        moderation_judgment.nouls.get('safe_for_automatic_discovery'),
        moderation_judgment.nouls.get('explicit_or_sensitive'),
        moderation_judgment.nouls.get('needs_review'),
        thresholds=thresholds,
    )

    payload = {
        'raw_nouls': dict(moderation_judgment.nouls),
        'model': resolved_model,
        'requested_model': requested_model,
        'classification_ms': round((time.monotonic() - started) * 1000),
        'usage': current_usage,
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

    judgment, _created = _get_or_create_judgment(
        model_name=resolved_model,
        status=ContentModerationJudgment.Status.COMPLETE,
        classification=_map_decision(policy_result.decision),
        payload=payload,
        content_item=content_item,
        source_data_hash=source_data_hash,
        question_revision=question_revision,
    )
    _observe(observation, reused=not _created, called=True, usage=current_usage)
    return judgment


def _get_or_create_judgment(
    *,
    model_name,
    status,
    classification=None,
    payload=None,
    content_item=None,
    source_data_hash=None,
    question_revision=None,
):
    """Atomic-friendly write that collapses duplicate inference identities."""
    lookup = {
        'content_item': content_item,
        'source_data_hash': source_data_hash,
        'model_name': model_name,
        'question_revision': question_revision,
    }
    defaults = {
        'status': status,
    }
    if classification is not None:
        defaults['classification'] = classification
    if payload is not None:
        defaults['payload'] = payload
    created_at = timezone.now()
    defaults['completed_at'] = created_at
    try:
        judgment, created = ContentModerationJudgment.objects.get_or_create(
            **lookup, defaults=defaults,
        )
    except IntegrityError:
        existing = ContentModerationJudgment.objects.filter(**lookup).first()
        if existing is None:
            raise
        return existing, False
    return judgment, created



def _map_decision(decision: str) -> str:
    return {
        'safe_for_automatic_discovery': ContentModerationJudgment.Classification.SAFE,
        'explicit_or_sensitive': ContentModerationJudgment.Classification.EXPLICIT,
        'needs_review': ContentModerationJudgment.Classification.NEEDS_REVIEW,
        'unknown': ContentModerationJudgment.Classification.UNKNOWN,
    }[decision]


def _default_settings(name):
    return getattr(settings, name)
