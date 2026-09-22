"""Offline tests for the framework-independent backfill runner (JEV-003B)."""
from types import SimpleNamespace

from django.test import SimpleTestCase

from content.services.backfill_runner import (
    BackfillLimits,
    BackfillMetrics,
    RetryIds,
    account_item,
    default_pricing,
    iter_items,
    run_backfill,
)


class _Item:
    def __init__(self, pk):
        self.pk = pk


def _metrics(max_ids=10):
    return BackfillMetrics(
        failed_ids=RetryIds(max_ids), unavailable_ids=RetryIds(max_ids),
    )


class BackfillLimitsTests(SimpleTestCase):
    def test_rejects_non_integer_and_below_minimum(self):
        with self.assertRaises(ValueError):
            BackfillLimits(limit=-1)
        with self.assertRaises(ValueError):
            BackfillLimits(batch_size=0)
        with self.assertRaises(ValueError):
            BackfillLimits(progress_every=0)

    def test_limit_is_exact_item_count_not_pk_window(self):
        items = [_Item(pk) for pk in (5, 1_000_000, 1_000_001)]
        pages = [items[:2], items[2:]]
        seen = list(iter_items(lambda last, n: pages.pop(0) if pages else [], after_id=4, limit=2, batch_size=2))
        self.assertEqual([i.pk for i in seen], [5, 1_000_000])


class PricingTests(SimpleTestCase):
    def test_estimate_carries_provenance(self):
        pricing = default_pricing()
        self.assertTrue(pricing.source_url.startswith('https://'))
        self.assertEqual(pricing.source_date, '2026-09-15')
        cost = pricing.estimate_cost_usd(1_000_000, 0)
        self.assertAlmostEqual(cost, 0.042)


class AccountItemTests(SimpleTestCase):
    def test_reuse_without_call_contributes_no_usage(self):
        m = _metrics()
        event = account_item(m, 7, kind='classified', observation={'reused': True, 'called': False},
                             classification='safe_for_automatic_discovery', model_name='jev-1.13.0')
        self.assertEqual(m.reused, 1)
        self.assertEqual(m.input_tokens, 0)
        self.assertEqual(m.missing_usage, 0)
        self.assertTrue(event['reused'])

    def test_called_without_usage_counts_missing(self):
        m = _metrics()
        account_item(m, 8, kind='classified', observation={'reused': False, 'called': True, 'usage': None},
                     classification='needs_review', model_name='jev-1.13.0')
        self.assertEqual(m.created, 1)
        self.assertEqual(m.missing_usage, 1)

    def test_retry_ids_are_bounded(self):
        m = _metrics(max_ids=2)
        for pk in (1, 2, 3):
            account_item(m, pk, kind='error', code='boom')
        self.assertEqual(m.error, 3)
        self.assertEqual(m.failed_ids.ids, [1, 2])
        self.assertEqual(m.failed_ids.dropped, 1)


class RunBackfillTests(SimpleTestCase):
    def test_continues_on_item_error_and_reports_cursor(self):
        items = [_Item(10), _Item(11), _Item(12)]
        def fetch_page(last_id, n):
            return [i for i in items if i.pk > last_id][:n]
        def classify(item, observation):
            if item.pk == 11:
                raise RuntimeError('bad item')
            observation.update({'reused': False, 'called': True,
                                'usage': {'input_tokens': 4, 'output_tokens': 1}})
            return SimpleNamespace(payload={}, classification='safe_for_automatic_discovery',
                                   model_name='jev-1.13.0')
        events = []
        summary = run_backfill(fetch_page=fetch_page, classify=classify,
                               limits=BackfillLimits(after_id=9, limit=3, batch_size=2, progress_every=10),
                               pricing=default_pricing(), emit=events.append,
                               clock=lambda: 0.0, sleep=lambda s: None)
        self.assertEqual(summary['scanned'], 3)
        self.assertEqual(summary['created'], 2)
        self.assertEqual(summary['error'], 1)
        self.assertEqual(summary['last_id'], 12)
        self.assertEqual(summary['failed_item_ids'], [11])
        self.assertEqual(events[-1]['event'], 'final_summary')
        self.assertIn('pricing_snapshot', summary)

    def test_progress_heartbeat_and_pacing(self):
        items = [_Item(1), _Item(2), _Item(3)]
        sleeps = []
        def classify(item, observation):
            observation.update({'reused': True, 'called': False})
            return SimpleNamespace(kind='skipped', code='moderation_disabled')
        events = []
        run_backfill(fetch_page=lambda last, n: [i for i in items if i.pk > last][:n],
                     classify=classify,
                     limits=BackfillLimits(limit=3, batch_size=3, progress_every=2, delay_ms=5),
                     pricing=default_pricing(), emit=events.append,
                     clock=lambda: 0.0, sleep=sleeps.append)
        kinds = [e['event'] for e in events]
        self.assertIn('progress', kinds)
        self.assertEqual(len(sleeps), 3)
