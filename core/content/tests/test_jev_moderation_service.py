"""Offline tests for the deterministic moderation classification service (JEV-003A)."""
from unittest.mock import patch

from django.db import IntegrityError
from django.test import TestCase, override_settings

from content.models import ContentItem, ContentModerationJudgment, MovieDetail
from content.services.moderation_service import (
    ModerationClassificationOutcome,
    _provider_explicit,
    build_state_and_hash,
    classify_content_item,
)


ENABLED = {'MODERATION_CLASSIFICATION_ENABLED': True}
DISABLED = {'MODERATION_CLASSIFICATION_ENABLED': False}


class _RecordingClient:
    def __init__(self):
        self.calls = []

    def classify(self, state):
        self.calls.append(state)

        class _Response:
            model = 'jev-latest'
            nouls = {
                'safe_for_automatic_discovery': 0.9,
                'explicit_or_sensitive': 0.05,
                'needs_review': 0.05,
            }
            usage = type('U', (), {'input_tokens': 11, 'output_tokens': 3})()

        return _Response()


class _UnavailableClient:
    def classify(self, state):
        from content.moderation.errors import ModerationUnavailable
        raise ModerationUnavailable('typesafe_timeout')


class _UnreachableFactory:
    def __init__(self):
        raise AssertionError('disabled mode must not construct the TypeSafe client')


def _movie_item(**overrides):
    item = ContentItem.objects.create(
        source_api=overrides.pop('source_api', ContentItem.SourceAPI.TMDB),
        external_id=overrides.pop('external_id', '5501'),
        content_type=ContentItem.ContentType.MOVIE,
    )
    MovieDetail.objects.create(
        content_item=item,
        title='Fight Club',
        description='A dystopian drama.',
    )
    return item


class ModerationServiceTests(TestCase):
    """Exhaustive coverage of the JEV-003A service contract."""

    def setUp(self):
        self.client = _RecordingClient()

    def test_state_hash_is_deterministic_for_identical_inputs(self):
        s1, h1 = build_state_and_hash(_movie_item(external_id='5501'))
        s2, h2 = build_state_and_hash(_movie_item(external_id='5502'))
        self.assertEqual((s1, h1), (s2, h2))

    def test_changed_normalized_input_produces_a_different_hash(self):
        item = _movie_item()
        _, original = build_state_and_hash(item)
        item.movie_detail.description = 'Changed description.'
        item.movie_detail.save()
        _, updated = build_state_and_hash(item)
        self.assertNotEqual(original, updated)

    @override_settings(**ENABLED)
    def test_idempotent_reuse_returns_same_judgment_without_second_call(self):
        item = _movie_item()
        first = classify_content_item(item, client=self.client)
        second = classify_content_item(item, client=self.client)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(len(self.client.calls), 1)

    @override_settings(**ENABLED)
    def test_changed_source_state_triggers_reclassification(self):
        item = _movie_item()
        classify_content_item(item, client=self.client)
        item.movie_detail.description = 'Updated plot for the movie.'
        item.movie_detail.save()
        classify_content_item(item, client=self.client)
        self.assertEqual(len(self.client.calls), 2)
        self.assertEqual(item.moderation_judgments.count(), 2)

    @override_settings(**DISABLED)
    def test_disabled_mode_returns_skipped_without_client_or_write(self):
        result = classify_content_item(_movie_item(), client_factory=_UnreachableFactory)
        self.assertIsInstance(result, ModerationClassificationOutcome)
        self.assertEqual(result.kind, 'skipped')
        self.assertEqual(result.code, 'moderation_disabled')
        self.assertFalse(ContentModerationJudgment.objects.exists())

    @override_settings(**ENABLED)
    def test_provider_explicit_override_short_circuits_without_jev_call(self):
        item = _movie_item()
        payload = {
            'type': 'movie', 'title': 'Fight Club',
            'description': 'A dystopian drama.',
            'adult': True,
        }
        with patch(
            'content.services.moderation_service.from_local', return_value=payload
        ):
            result = classify_content_item(item, client=self.client)
        self.assertEqual(len(self.client.calls), 0)
        self.assertEqual(result.classification, ContentModerationJudgment.Classification.EXPLICIT)
        self.assertEqual(result.payload['policy']['reason'], 'provider_explicit_override')

    @override_settings(**ENABLED)
    def test_successful_judgment_persists_raw_payload_and_usage(self):
        judgment = classify_content_item(_movie_item(), client=self.client)
        self.assertEqual(judgment.status, ContentModerationJudgment.Status.COMPLETE)
        self.assertEqual(judgment.payload['raw_nouls']['safe_for_automatic_discovery'], 0.9)
        self.assertEqual(judgment.payload['usage']['input_tokens'], 11)
        self.assertEqual(judgment.payload['usage']['output_tokens'], 3)
        self.assertIn('classification_ms', judgment.payload)

    @override_settings(**ENABLED)
    def test_unavailable_failure_does_not_break_caller_and_marks_error(self):
        item = _movie_item()
        result = classify_content_item(item, client=_UnavailableClient())
        self.assertIsInstance(result, ModerationClassificationOutcome)
        self.assertEqual(result.kind, 'unavailable')
        self.assertEqual(result.code, 'typesafe_timeout')
        self.assertEqual(
            ContentModerationJudgment.objects.first().status,
            ContentModerationJudgment.Status.ERROR,
        )

    def test_non_tmdb_providers_never_certify_safety(self):
        for api in (
            ContentItem.SourceAPI.IGDB, ContentItem.SourceAPI.SPOTIFY,
            ContentItem.SourceAPI.OPENLIBRARY,
        ):
            item = _movie_item(source_api=api, external_id=str(api))
            self.assertIsNone(_provider_explicit(item))
