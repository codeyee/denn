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
    def __init__(self, response_model='jev-1.13.0', input_tokens=11, output_tokens=3):
        self.calls = []
        self.response_model = response_model
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens

    def classify(self, state):
        self.calls.append(state)
        response_model = self.response_model
        input_tokens = self.input_tokens
        output_tokens = self.output_tokens

        class _Response:
            model = response_model
            nouls = {
                'safe_for_automatic_discovery': 0.9,
                'explicit_or_sensitive': 0.05,
                'needs_review': 0.05,
            }
            usage = type('U', (), {'input_tokens': input_tokens, 'output_tokens': output_tokens})()

        return _Response()


class _NoUsageClient:
    """A client whose response omits the usage object entirely."""

    def __init__(self):
        self.calls = []

    def classify(self, state):
        self.calls.append(state)

        class _Response:
            model = 'jev-1.13.0'
            nouls = {
                'safe_for_automatic_discovery': 0.9,
                'explicit_or_sensitive': 0.05,
                'needs_review': 0.05,
            }
            usage = None

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
    def test_concrete_model_pre_reuses_judgment_without_second_call(self):
        item = _movie_item()
        first = classify_content_item(item, client=self.client, model='jev-1.13.0')
        second = classify_content_item(item, client=self.client, model='jev-1.13.0')
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(len(self.client.calls), 1)
        self.assertEqual(first.model_name, 'jev-1.13.0')

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
    def test_unavailable_failure_returns_typed_outcome_with_no_row(self):
        item = _movie_item()
        result = classify_content_item(item, client=_UnavailableClient())
        self.assertIsInstance(result, ModerationClassificationOutcome)
        self.assertEqual(result.kind, 'unavailable')
        self.assertEqual(result.code, 'typesafe_timeout')
        self.assertFalse(ContentModerationJudgment.objects.exists())

    def test_non_tmdb_providers_never_certify_safety(self):
        for api in (
            ContentItem.SourceAPI.IGDB, ContentItem.SourceAPI.SPOTIFY,
            ContentItem.SourceAPI.OPENLIBRARY,
        ):
            item = _movie_item(source_api=api, external_id=str(api))
            self.assertIsNone(_provider_explicit(item))

    @override_settings(**ENABLED)
    def test_alias_request_resolves_concrete_model_and_records_requested_model(self):
        judgment = classify_content_item(
            _movie_item(), client=_RecordingClient(), model='jev-latest'
        )
        self.assertEqual(judgment.model_name, _RecordingClient().response_model)
        self.assertEqual(judgment.payload['requested_model'], 'jev-latest')

    @override_settings(**ENABLED)
    def test_alias_request_performs_second_call_instead_of_stale_pre_reuse(self):
        item = _movie_item()
        client = _RecordingClient()
        classify_content_item(item, client=client, model='jev-latest')
        classify_content_item(item, client=client, model='jev-latest')
        self.assertEqual(len(client.calls), 2)

    @override_settings(**ENABLED)
    def test_missing_detail_returns_state_unavailable_with_no_client_calls(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='9999',
            content_type=ContentItem.ContentType.MOVIE,
        )
        client = _RecordingClient()
        result = classify_content_item(item, client=client)
        self.assertIsInstance(result, ModerationClassificationOutcome)
        self.assertEqual(result.kind, 'skipped')
        self.assertEqual(result.code, 'state_unavailable')
        self.assertEqual(len(client.calls), 0)
        self.assertFalse(ContentModerationJudgment.objects.exists())

    @override_settings(**ENABLED)
    def test_successful_judgment_never_leaves_pending_state(self):
        judgment = classify_content_item(_movie_item(), client=self.client)
        self.assertEqual(
            ContentModerationJudgment.objects.filter(
                status=ContentModerationJudgment.Status.PENDING,
            ).count(),
            0,
        )
        self.assertEqual(judgment.status, ContentModerationJudgment.Status.COMPLETE)

    def test_canonical_hash_is_nonempty_sha256_hex(self):
        _, digest = build_state_and_hash(_movie_item())
        self.assertEqual(len(digest), 64)
        self.assertTrue(all(c in '0123456789abcdef' for c in digest))

    @override_settings(**ENABLED)
    def test_race_integrity_error_collapses_to_existing_judgment(self):
        item = _movie_item()
        first = classify_content_item(item, client=self.client)
        with patch.object(
            ContentModerationJudgment.objects,
            'get_or_create',
            side_effect=IntegrityError,
        ):
            second = classify_content_item(item, client=self.client)
        self.assertEqual(first.pk, second.pk)

    @override_settings(**ENABLED)
    def test_provider_override_writes_provider_rule_audit_identity(self):
        item = _movie_item()
        payload = {'type': 'movie', 'title': 'x', 'description': 'd', 'adult': True}
        with patch(
            'content.services.moderation_service.from_local', return_value=payload
        ):
            judgment = classify_content_item(item, client=self.client)
        self.assertEqual(judgment.model_name, 'provider-rule:v1')
        self.assertEqual(judgment.payload['requested_model'], 'jev-latest')
        self.assertEqual(judgment.payload['provider_explicit'], True)
        self.assertEqual(judgment.payload['raw_nouls'], {})


class ObservationContractTests(TestCase):
    """Invocation metadata: `reused`, `called`, and current-call usage."""

    def setUp(self):
        self.client = _RecordingClient()

    @override_settings(**DISABLED)
    def test_disabled_mode_reports_no_call_and_no_usage(self):
        observation = {}
        classify_content_item(_movie_item(), observation=observation)
        self.assertEqual(
            observation, {'reused': False, 'called': False, 'usage': None}
        )

    @override_settings(**ENABLED)
    def test_state_unavailable_reports_no_call_and_no_usage(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='obs-no-detail',
            content_type=ContentItem.ContentType.MOVIE,
        )
        observation = {}
        classify_content_item(item, client=self.client, observation=observation)
        self.assertEqual(len(self.client.calls), 0)
        self.assertEqual(
            observation, {'reused': False, 'called': False, 'usage': None}
        )

    @override_settings(**ENABLED)
    def test_first_call_reports_called_with_current_usage(self):
        observation = {}
        classify_content_item(
            _movie_item(), client=self.client, observation=observation
        )
        self.assertEqual(observation['reused'], False)
        self.assertEqual(observation['called'], True)
        self.assertEqual(
            observation['usage'], {'input_tokens': 11, 'output_tokens': 3}
        )

    @override_settings(**ENABLED)
    def test_pinned_reuse_reports_reused_without_a_call(self):
        item = _movie_item()
        classify_content_item(item, client=self.client, model='jev-1.13.0')
        observation = {}
        classify_content_item(
            item, client=self.client, model='jev-1.13.0', observation=observation
        )
        self.assertEqual(len(self.client.calls), 1)
        self.assertEqual(
            observation, {'reused': True, 'called': False, 'usage': None}
        )

    @override_settings(**ENABLED)
    def test_provider_override_reports_no_call_and_no_usage(self):
        item = _movie_item()
        payload = {
            'type': 'movie',
            'title': 'Fight Club',
            'description': 'A dystopian drama.',
            'adult': True,
        }
        observation = {}
        with patch(
            'content.services.moderation_service.from_local', return_value=payload
        ):
            classify_content_item(item, client=self.client, observation=observation)
        self.assertEqual(len(self.client.calls), 0)
        self.assertEqual(
            observation, {'reused': False, 'called': False, 'usage': None}
        )

    @override_settings(**ENABLED)
    def test_unavailable_reports_no_call_and_no_usage(self):
        observation = {}
        classify_content_item(
            _movie_item(), client=_UnavailableClient(), observation=observation
        )
        self.assertEqual(
            observation, {'reused': False, 'called': False, 'usage': None}
        )

    @override_settings(**ENABLED)
    def test_response_without_usage_reports_called_with_unreported_tokens(self):
        observation = {}
        classify_content_item(
            _movie_item(), client=_NoUsageClient(), observation=observation
        )
        self.assertEqual(observation['called'], True)
        self.assertEqual(
            observation['usage'], {'input_tokens': None, 'output_tokens': None}
        )

    @override_settings(**ENABLED)
    def test_alias_call_collapsing_onto_existing_row_keeps_current_usage(self):
        item = _movie_item()
        first_client = _RecordingClient(input_tokens=11, output_tokens=3)
        first = classify_content_item(item, client=first_client, model='jev-latest')
        self.assertEqual(first.payload['usage']['input_tokens'], 11)

        # The alias path always calls Jev, and the resolved model already has a
        # row, so the write collapses. Usage must describe THIS call.
        second_client = _RecordingClient(input_tokens=77, output_tokens=9)
        observation = {}
        second = classify_content_item(
            item, client=second_client, model='jev-latest', observation=observation
        )
        self.assertEqual(second.pk, first.pk)
        self.assertEqual(len(second_client.calls), 1)
        self.assertEqual(observation['reused'], True)
        self.assertEqual(observation['called'], True)
        self.assertEqual(
            observation['usage'], {'input_tokens': 77, 'output_tokens': 9}
        )

    @override_settings(**ENABLED)
    def test_observation_is_optional_for_existing_callers(self):
        judgment = classify_content_item(_movie_item(), client=self.client)
        self.assertEqual(judgment.status, ContentModerationJudgment.Status.COMPLETE)
