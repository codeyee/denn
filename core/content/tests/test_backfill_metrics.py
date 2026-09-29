"""Offline pure tests for the backfill pricing core (slices 2A-2B)."""
import json
import unittest

from content.services.backfill_metrics import (
    BackfillMetrics,
    RetryIds,
    account_item,
    default_pricing,
    parse_price,
    summarize,
)


class PricingTests(unittest.TestCase):
    def test_default_snapshot_carries_provenance_and_prices_input_only(self):
        pricing = default_pricing()
        for key in ('source_url', 'source_date', 'accessed_date', 'currency',
                    'input_tokens_per_unit', 'input_price_per_unit',
                    'output_tokens_per_unit', 'output_price_per_unit'):
            self.assertIn(key, pricing.as_dict())
        self.assertEqual(pricing.estimate_cost_usd(1_000_000, 500_000), 0.042)
        self.assertEqual(pricing.estimate_cost_usd(0, 0), 0.0)

    def test_input_rate_override_keeps_provenance(self):
        base, custom = default_pricing(), default_pricing().with_input_rate(0.10)
        self.assertEqual(custom.estimate_cost_usd(1_000_000, 0), 0.10)
        self.assertEqual(custom.source_url, base.source_url)
        self.assertIn('override', custom.note)

    def test_parse_price_accepts_zero_and_numeric_strings(self):
        self.assertEqual((parse_price(0), parse_price('0.05')), (0.0, 0.05))

    def test_parse_price_rejects_bad_rates(self):
        for raw in (-1, '-0.5', float('nan'), 'nan', float('inf'),
                    float('-inf'), 'inf', 'abc', None, True, False):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                parse_price(raw)


class RetryIdsTests(unittest.TestCase):
    def test_collects_up_to_max_then_counts_and_flags_drops(self):
        retry = RetryIds(2)
        for item_id in (7, 8, 9):
            retry.add(item_id)
        self.assertEqual(retry.as_summary('failed_item_ids'), {
            'failed_item_ids': [7, 8],
            'failed_item_ids_truncated_count': 1,
            'failed_item_ids_truncated': True,
        })

    def test_empty_collector_reports_no_truncation(self):
        self.assertEqual(RetryIds(2).as_summary('u'), {
            'u': [], 'u_truncated_count': 0, 'u_truncated': False})

    def test_max_zero_drops_everything_but_counts(self):
        retry = RetryIds(0); retry.add(1)
        self.assertEqual((retry.ids, retry.dropped), ([], 1))

    def test_rejects_bad_bounds(self):
        for raw in (-1, True, 'x', None):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                RetryIds(raw)


class AccountItemTests(unittest.TestCase):
    def test_outcome_counters_buckets_and_retry_ids(self):
        metrics = BackfillMetrics()
        account_item(metrics, 1, kind='classified', classification='needs_review',
                     model_name='jev-1.13.0',
                     observation={'reused': False, 'called': True,
                                  'usage': {'input_tokens': 2, 'output_tokens': 1}})
        account_item(metrics, 2, kind='classified', classification='explicit_or_sensitive',
                     provider_override=True,
                     observation={'reused': True, 'called': False, 'usage': None})
        account_item(metrics, 3, kind='skipped', code='moderation_disabled')
        account_item(metrics, 4, kind='unavailable', code='typesafe_timeout')
        account_item(metrics, 5, kind='error', code='unhandled_exception')
        with self.assertRaises(ValueError):
            account_item(metrics, 6, kind='archived')
        self.assertEqual((metrics.created, metrics.reused, metrics.provider_override,
                          metrics.skipped, metrics.unavailable, metrics.error),
                         (1, 1, 1, 1, 1, 1))
        self.assertEqual((metrics.buckets['needs_review'],
                          metrics.buckets['explicit_or_sensitive']), (1, 1))
        self.assertEqual((metrics.unavailable_ids.ids, metrics.failed_ids.ids),
                         ([4], [5]))
        self.assertEqual((metrics.input_tokens, metrics.output_tokens,
                          metrics.missing_usage), (2, 1, 0))

    def test_usage_accounting_follows_call_semantics(self):
        cases = [
            # (observation, expected (input, output, missing))
            ({'reused': True, 'called': False,
              'usage': {'input_tokens': 50, 'output_tokens': 50}}, (0, 0, 0)),
            ({'reused': False, 'called': True, 'usage': None}, (0, 0, 1)),
            ({'reused': False, 'called': True, 'usage': {}}, (0, 0, 1)),
            ({'reused': False, 'called': True,
              'usage': {'input_tokens': None, 'output_tokens': None}}, (0, 0, 1)),
            ({'reused': False, 'called': True,
              'usage': {'input_tokens': 5, 'output_tokens': None}}, (5, 0, 0)),
            ({'reused': True, 'called': True,
              'usage': {'input_tokens': 77, 'output_tokens': 9}}, (77, 9, 0)),
        ]
        for observation, expected in cases:
            with self.subTest(observation=observation):
                metrics = BackfillMetrics()
                event = account_item(metrics, 1, kind='classified',
                                     classification='safe_for_automatic_discovery',
                                     observation=observation)
                self.assertEqual((metrics.input_tokens, metrics.output_tokens,
                                  metrics.missing_usage), expected)
                self.assertEqual(event['reused'], observation['reused'])
                if not observation['called']:
                    self.assertIsNone(event['usage'])

    def test_invalid_token_counts_raise_without_mutating(self):
        for usage in ({'input_tokens': -1, 'output_tokens': 2},
                      {'input_tokens': 2, 'output_tokens': -5},
                      {'input_tokens': True, 'output_tokens': 1},
                      {'input_tokens': '7', 'output_tokens': 1},
                      {'input_tokens': 1.5, 'output_tokens': 1}):
            with self.subTest(usage=usage):
                metrics = BackfillMetrics()
                with self.assertRaises(ValueError):
                    account_item(metrics, 1, kind='classified', classification='unknown',
                                 observation={'reused': False, 'called': True,
                                              'usage': usage})
                self.assertEqual((metrics.input_tokens, metrics.output_tokens,
                                  metrics.missing_usage), (0, 0, 0))

    def test_event_is_json_serializable_with_stable_schema(self):
        event = account_item(
            BackfillMetrics(), 12, kind='classified', classification='unknown',
            model_name='m', duration_ms=4,
            observation={'reused': False, 'called': True,
                         'usage': {'input_tokens': 1, 'output_tokens': 0}})
        self.assertEqual(json.loads(json.dumps(event)), event)
        self.assertEqual(sorted(event),
                         ['classification', 'code', 'duration_ms', 'event', 'item_id',
                          'model_name', 'outcome', 'provider_override', 'reused', 'usage'])


class SummarizeTests(unittest.TestCase):
    def test_summary_carries_accounting_cost_and_provenance(self):
        metrics = BackfillMetrics(scanned=3, created=1, reused=1, skipped=1, last_id=41,
                                  input_tokens=1_000_000, output_tokens=9, missing_usage=2)
        metrics.buckets['safe_for_automatic_discovery'] = 1
        summary = summarize(metrics, default_pricing(), duration_seconds=2.0)
        self.assertEqual(summary['event'], 'final_summary')
        self.assertEqual((summary['scanned'], summary['created'], summary['reused'],
                          summary['skipped'], summary['last_id']), (3, 1, 1, 1, 41))
        self.assertEqual((summary['input_tokens'], summary['output_tokens'],
                          summary['missing_usage']), (1_000_000, 9, 2))
        self.assertEqual(summary['estimated_cost_usd'], 0.042)
        self.assertEqual(summary['pricing_snapshot']['currency'], 'USD')
        self.assertEqual(summary['throughput_items_per_second'], 1.5)
        self.assertEqual((summary['failed_item_ids'],
                          summary['failed_item_ids_truncated_count'],
                          summary['failed_item_ids_truncated'],
                          summary['unavailable_item_ids_truncated']), ([], 0, False, False))
        self.assertEqual(json.loads(json.dumps(summary)), summary)

    def test_summary_rejects_bad_duration(self):
        for raw in (-1, float('nan'), float('inf'), 'x', None, True):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                summarize(BackfillMetrics(), default_pricing(), duration_seconds=raw)
