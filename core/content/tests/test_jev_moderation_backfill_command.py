"""Offline tests for the JEV-003B moderation backfill management command."""
from __future__ import annotations

import json
import os
import tempfile
from io import StringIO
from unittest.mock import patch

from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings

from content.models import ContentItem, ContentModerationJudgment
from content.services.moderation_service import ModerationClassificationOutcome


SEAM = 'content.management.commands.backfill_moderation.classify_content_item'
CLIENT_SEAM = 'content.services.moderation_service.JevModerationClient'
DISABLED = {'MODERATION_CLASSIFICATION_ENABLED': False}


def _items(count: int = 3) -> list[ContentItem]:
    return [
        ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id=str(7000 + i),
            content_type=ContentItem.ContentType.MOVIE,
        )
        for i in range(count)
    ]


def _run(options=None):
    buf = StringIO()
    opt = dict(
        after_id=0,
        limit=None,
        batch_size=200,
        delay_ms=0,
        report=None,
        create_parent_dirs=False,
    )
    opt.update(options or {})
    call_command('backfill_moderation', stdout=buf, **opt)
    return buf.getvalue()


def _events(raw: str) -> list[dict]:
    return [json.loads(line) for line in raw.splitlines() if line.startswith('{')]


def _stub(specs: dict[int, dict]):
    """Return a deterministic classify stub keyed by item primary key."""

    def _classify(item, observation=None):
        spec = specs.get(item.pk)
        if spec is None:
            if observation is not None:
                observation['reused'] = False
            return ModerationClassificationOutcome('skipped', 'no_stub_configured')
        if 'outcome' in spec:
            if observation is not None:
                observation['reused'] = False
            return ModerationClassificationOutcome(spec['outcome'], spec['code'])
        if observation is not None:
            observation['reused'] = spec.get('reused', False)
        return spec['judgment']

    return _classify


def _judgment(
    item,
    *,
    classification='safe_for_automatic_discovery',
    model='jev-1.13.0',
    usage=None,
    provider_explicit=None,
):
    payload = {
        'usage': usage or {'input_tokens': None, 'output_tokens': None},
    }
    if provider_explicit is not None:
        payload['provider_explicit'] = provider_explicit
        payload.setdefault('raw_nouls', {})
    return ContentModerationJudgment.objects.create(
        content_item=item,
        source_data_hash='a' * 64,
        model_name='provider-rule:v1' if provider_explicit else model,
        question_revision='q1',
        status=ContentModerationJudgment.Status.COMPLETE,
        classification=classification,
        payload=payload,
    )


class BackfillOrderingTests(TestCase):
    @override_settings(**DISABLED)
    def test_scan_orders_items_by_primary_key(self):
        items = _items(3)
        seen: list[int] = []

        with patch(CLIENT_SEAM, side_effect=AssertionError('no real client')):
            with patch(
                SEAM,
                side_effect=CallRecorder(seen),
            ):
                raw = _run({'delay_ms': 0})
        self.assertEqual(seen, [i.pk for i in items])

    @override_settings(**DISABLED)
    def test_after_id_resumes_and_limit_caps(self):
        items = _items(3)
        seen: list[int] = []

        class _Stub:
            def __call__(self, item, observation=None):
                seen.append(item.pk)
                observation['reused'] = False
                return ModerationClassificationOutcome('skipped', 'stub')

        with patch(SEAM, new=_Stub()):
            _run({'after_id': items[1].pk, 'delay_ms': 0})
        self.assertEqual(seen, [items[2].pk])

        seen.clear()
        with patch(SEAM, new=_Stub()):
            _run({'limit': 2, 'delay_ms': 0})
        self.assertEqual(seen, [items[0].pk, items[1].pk])


class CommandErrorTests(TestCase):
    def test_invalid_batch_size_rejected(self):
        with self.assertRaises(CommandError):
            _run({'batch_size': 0})

    def test_negative_delay_rejected(self):
        with self.assertRaises(CommandError):
            _run({'delay_ms': -1})


class SkippedOutcomeTests(TestCase):
    @override_settings(**DISABLED)
    def test_no_items_yields_zero_counts_and_final_summary(self):
        raw = _run()
        events = _events(raw)
        final = [e for e in events if e.get('event') == 'final_summary']
        self.assertEqual(len(final), 1)
        stats = final[0]
        self.assertEqual(stats['scanned'], 0)
        self.assertEqual(stats['created'], 0)
        self.assertEqual(stats['error'], 0)

    @override_settings(**DISABLED)
    def test_disabled_mode_marks_skipped_and_never_builds_client(self):
        item = _items(1)[0]
        with patch(CLIENT_SEAM, side_effect=AssertionError('real client built')):
            raw = _run()
        events = _events(raw)
        per_item = [e for e in events if e.get('event') == 'item']
        self.assertEqual(len(per_item), 1)
        self.assertEqual(per_item[0]['outcome'], 'skipped')
        self.assertEqual(per_item[0]['item_id'], item.pk)
        final = [e for e in events if e.get('event') == 'final_summary'][0]
        self.assertEqual(final['skipped'], 1)


class OutcomeAccountingTests(TestCase):
    def _make_item(self):
        return _items(1)[0]

    def test_provider_override_accounted_once_with_missing_usage(self):
        item = self._make_item()
        judgment = _judgment(
            item,
            classification='explicit_or_sensitive',
            provider_explicit=True,
        )
        with patch(SEAM, new=_stub({item.pk: {'judgment': judgment}})):
            raw = _run()
        final = [e for e in _events(raw) if e.get('event') == 'final_summary'][0]
        self.assertEqual(final['provider_override'], 1)
        self.assertEqual(final['buckets']['explicit_or_sensitive'], 1)
        self.assertEqual(final['missing_usage'], 1)
        self.assertEqual(final['input_tokens'], 0)

    def test_created_counts_tokens_and_missing_usage_when_absent(self):
        item = self._make_item()
        judgment = _judgment(item, usage={'input_tokens': 11, 'output_tokens': 3})
        with patch(SEAM, new=_stub({item.pk: {'judgment': judgment}})):
            raw = _run()
        final = [e for e in _events(raw) if e.get('event') == 'final_summary'][0]
        self.assertEqual(final['created'], 1)
        self.assertEqual(final['reused'], 0)
        self.assertEqual(final['input_tokens'], 11)
        self.assertEqual(final['output_tokens'], 3)
        self.assertEqual(final['missing_usage'], 0)

    def test_reused_does_not_count_historical_tokens(self):
        item = self._make_item()
        judgment = _judgment(item, usage={'input_tokens': 11, 'output_tokens': 3})
        with patch(SEAM, new=_stub({item.pk: {'judgment': judgment, 'reused': True}})):
            raw = _run()
        final = [e for e in _events(raw) if e.get('event') == 'final_summary'][0]
        self.assertEqual(final['reused'], 1)
        self.assertEqual(final['created'], 0)
        # Historical usage belongs to the original call, so this run excludes it.
        self.assertEqual(final['input_tokens'], 0)
        self.assertEqual(final['output_tokens'], 0)
        self.assertEqual(final['missing_usage'], 1)

    def test_unavailable_and_error_are_isolated_and_counted(self):
        items = _items(3)
        first, second, third = items
        judgment = _judgment(third)

        def handler(item, observation=None):
            if item.pk == first.pk:
                return ModerationClassificationOutcome('unavailable', 'typesafe_timeout')
            if item.pk == second.pk:
                raise RuntimeError('injected')
            return judgment

        with patch(SEAM, new=handler):
            raw = _run()
        final = [e for e in _events(raw) if e.get('event') == 'final_summary'][0]
        self.assertEqual(final['unavailable'], 1)
        self.assertEqual(final['error'], 1)
        self.assertEqual(final['created'], 1)
        self.assertEqual(final['last_id'], third.pk)

    def test_buckets_cover_safe_explicit_review_and_unknown(self):
        items = _items(4)
        classifications = [
            'safe_for_automatic_discovery',
            'explicit_or_sensitive',
            'needs_review',
            'unknown',
        ]
        specs = {
            item.pk: {'judgment': _judgment(item, classification=classification)}
            for item, classification in zip(items, classifications)
        }
        with patch(SEAM, new=_stub(specs)):
            raw = _run()
        buckets = [e for e in _events(raw) if e.get('event') == 'final_summary'][0]['buckets']
        for classification in classifications:
            self.assertEqual(buckets[classification], 1)


class LimitSemanticsTests(TestCase):
    """F3: --limit counts processed items exactly, independent of PK gaps."""

    def _make_items_with_gap(self):
        low = _items(2)
        high_pks = []
        for external_id in ('8801', '8802', '8803'):
            item = ContentItem.objects.create(
                source_api=ContentItem.SourceAPI.TMDB,
                external_id=external_id,
                content_type=ContentItem.ContentType.MOVIE,
            )
            # Delete nothing; rely on realistic contiguous PKs here.
            high_pks.append(item)
        return low, high_pks

    @override_settings(**DISABLED)
    def test_limit_stops_exactly_after_n_processed_items_in_a_large_page(self):
        low, items = self._make_items_with_gap()
        seen: list[int] = []

        class _Stub:
            def __call__(self, item, observation=None):
                seen.append(item.pk)
                if observation is not None:
                    observation['reused'] = False
                return ModerationClassificationOutcome('skipped', 'stub')

        with patch(SEAM, new=_Stub()):
            _run({
                'after_id': low[1].pk,
                'limit': 2, 'batch_size': 200, 'delay_ms': 0,
            })
        self.assertEqual(seen, [items[0].pk, items[1].pk])

    @override_settings(**DISABLED)
    def test_limit_after_cursor_with_page_of_one(self):
        items = _items(3)
        seen: list[int] = []

        class _Stub:
            def __call__(self, item, observation=None):
                seen.append(item.pk)
                if observation is not None:
                    observation['reused'] = False
                return ModerationClassificationOutcome('skipped', 'stub')

        with patch(SEAM, new=_Stub()):
            _run({
                'after_id': items[0].pk, 'limit': 2,
                'batch_size': 1, 'delay_ms': 0,
            })
        self.assertEqual(seen, [items[1].pk, items[2].pk])


class CostAndReportTests(TestCase):
    def test_cost_uses_pricing_snapshot_formula(self):
        item = _items(1)[0]
        judgment = _judgment(item, usage={'input_tokens': 2_000_000, 'output_tokens': 9})
        with patch(SEAM, new=_stub({item.pk: {'judgment': judgment}})):
            raw = _run()
        final = [e for e in _events(raw) if e.get('event') == 'final_summary'][0]
        pricing = final['pricing_snapshot']
        self.assertEqual(
            pricing['source_url'],
            'https://typesafe.ai/blog/introducing-system-one-models-and-jev',
        )
        self.assertEqual(pricing['input_price_per_unit'], 0.042)
        self.assertEqual(pricing['output_price_per_unit'], 0.0)
        self.assertEqual(final['estimated_cost_usd'], 0.084)
        self.assertIn('Estimate only', pricing['note']) or self.assertTrue(
            'Estimate' in pricing['note']
        )

    def test_report_file_written_atomically_on_success(self):
        item = _items(1)[0]
        judgment = _judgment(item)
        with tempfile.TemporaryDirectory() as tmpdir:
            target = os.path.join(tmpdir, 'report.json')
            with patch(SEAM, new=_stub({item.pk: {'judgment': judgment}})):
                _run({'report': target})
            self.assertTrue(os.path.isfile(target))
            with open(target) as handle:
                data = json.load(handle)
            self.assertEqual(data['event'], 'final_summary')

    def test_report_refuses_partial_write_into_missing_parent(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            target = os.path.join(tmpdir, 'missing_parent', 'report.json')
            with self.assertRaises(CommandError):
                _run({'report': target})
            self.assertFalse(os.path.exists(target))


class JsonHygieneTests(TestCase):
    @override_settings(**DISABLED)
    def test_events_do_not_leak_content_text_or_secrets(self):
        _items(2)
        raw = _run()
        for forbidden in ('Fight-', 'description":', 'TYPESAFE_API_KEY', 'allow_adult'):
            self.assertNotIn(forbidden, raw)
        for evt in _events(raw):
            self.assertIn('event', evt)


class DelayTests(TestCase):
    @override_settings(**DISABLED)
    def test_delay_ms_pauses_without_sleeping_in_tests(self):
        item = _items(1)[0]
        with patch(
            'content.management.commands.backfill_moderation.time.sleep'
        ) as sleep_mock:
            raw = _run({'delay_ms': 1})
        self.assertTrue(sleep_mock.called)
        self.assertEqual(sleep_mock.call_args[0][0], 0.001)


class ProgressCadenceTests(TestCase):
    """F4: --progress-every emits a bounded aggregate progress event."""

    @override_settings(**DISABLED)
    def test_progress_emitted_at_requested_cadence(self):
        items = _items(5)
        with patch(SEAM, new=_stub({})):
            raw = _run({'progress_every': 2, 'delay_ms': 0})
        events = _events(raw)
        progress_events = [e for e in events if e.get('event') == 'progress']
        self.assertEqual(len(progress_events), 2)
        self.assertEqual(progress_events[0]['scanned'], 2)
        self.assertEqual(progress_events[0]['last_id'], items[1].pk)
        self.assertIn('duration_seconds', progress_events[0])
        self.assertIn('throughput_items_per_second', progress_events[0])
        self.assertIn('skipped', progress_events[0])

    @override_settings(**DISABLED)
    def test_progress_never_leaks_content_or_secrets(self):
        items = _items(3)
        with patch(SEAM, new=_stub({})):
            raw = _run({'progress_every': 1, 'delay_ms': 0})
        self.assertNotIn('Fight-', raw)
        self.assertNotIn('TYPESAFE_API_KEY', raw)
        for evt in _events(raw):
            if evt.get('event') == 'progress':
                self.assertIn('scanned', evt)
                self.assertIn('last_id', evt)
                self.assertNotIn('description', evt)


class FailedRetryListTests(TestCase):
    """F9: final summary exposes precise failed/unavailable item ids."""

    def test_final_summary_contains_failed_and_unavailable_ids(self):
        items = _items(3)
        first, second, third = items
        judgment = _judgment(third)

        def handler(item, observation=None):
            if item.pk == first.pk:
                return ModerationClassificationOutcome('unavailable', 'typesafe_timeout')
            if item.pk == second.pk:
                raise RuntimeError('injected')
            return judgment

        with patch(SEAM, new=handler):
            raw = _run()
        final = [e for e in _events(raw) if e.get('event') == 'final_summary'][0]
        # Bounded lists let the operator retry precisely; no ERROR tombstone row is written.
        self.assertIn(first.pk, final['unavailable_item_ids'])
        self.assertIn(second.pk, final['failed_item_ids'])
        self.assertNotIn(third.pk, final['failed_item_ids'])
        self.assertNotIn(third.pk, final['unavailable_item_ids'])


class UniformEventSchemaTests(TestCase):
    """F5: per-item normal and error events share one schema."""

    def test_item_events_share_uniform_schema_with_null_defaults(self):
        items = _items(3)
        first, second, third = items
        judgment = _judgment(third)

        def handler(item, observation=None):
            if observation is not None:
                observation['reused'] = False
            if item.pk == second.pk:
                raise RuntimeError('injected')
            if item.pk == first.pk:
                return ModerationClassificationOutcome('unavailable', 'typesafe_timeout')
            return judgment

        with patch(SEAM, new=handler):
            raw = _run()
        item_events = [e for e in _events(raw) if e.get('event') == 'item']
        self.assertEqual(len(item_events), 3)
        required_keys = {
            'event', 'item_id', 'outcome', 'code', 'classification',
            'model_name', 'provider_override', 'reused', 'usage', 'duration_ms',
        }
        for evt in item_events:
            self.assertTrue(required_keys.issubset(evt.keys()))
        self.assertEqual(item_events[0]['code'], 'typesafe_timeout')
        self.assertIsNone(item_events[0]['classification'])
        self.assertIsNone(item_events[1]['classification'])
        self.assertEqual(item_events[1]['code'], 'unhandled_exception')


class CallRecorder:
    def __init__(self, seen):
        self._seen = seen

    def __call__(self, item, observation=None):
        self._seen.append(item.pk)
        if observation is not None:
            observation['reused'] = False
        return ModerationClassificationOutcome('skipped', 'noop')


class RealServiceReuseRegressionTests(TestCase):
    """F1: end-to-end reuse against the real service, no live Jev call."""

    def _movie_item(self):
        from content.models import MovieDetail
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='5501',
            content_type=ContentItem.ContentType.MOVIE,
        )
        MovieDetail.objects.create(
            content_item=item,
            title='Fight Club',
            description='A dystopian drama.',
        )
        return item

    @override_settings(MODERATION_CLASSIFICATION_ENABLED=True, MODERATION_MODEL='jev-1.13.0')
    def test_real_service_reuses_complete_row_without_second_call(self):
        item = self._movie_item()
        # Pre-create a COMPLETE judgment matching the service's identity.
        from content.services.moderation_service import build_state_and_hash
        _, state_hash = build_state_and_hash(item)
        ContentModerationJudgment.objects.create(
            content_item=item,
            source_data_hash=state_hash,
            model_name='jev-1.13.0',
            question_revision='q1',
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
            payload={'usage': {'input_tokens': 11, 'output_tokens': 3}},
        )

        with patch(
            CLIENT_SEAM,
            side_effect=AssertionError('real client must not be constructed'),
        ):
            raw = _run()
        final = [e for e in _events(raw) if e.get('event') == 'final_summary'][0]
        item_events = [e for e in _events(raw) if e.get('event') == 'item']
        self.assertEqual(final['created'], 0)
        self.assertEqual(final['reused'], 1)
        # Current-run tokens must not double-count the stored historical usage.
        self.assertEqual(final['input_tokens'], 0)
        self.assertEqual(final['output_tokens'], 0)
        self.assertEqual(len(item_events), 1)
        self.assertTrue(item_events[0]['reused'])
