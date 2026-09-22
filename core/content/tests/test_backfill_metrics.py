"""Offline pure tests for the backfill pricing core (slice 2A)."""
import unittest

from content.services.backfill_metrics import default_pricing, parse_price


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
