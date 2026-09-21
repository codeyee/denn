"""Offline table-driven tests for the deterministic moderation composer (JEV-002B)."""
import unittest

from content.moderation.policy import PolicyThresholds, compose_policy


class ModerationPolicyComposerTests(unittest.TestCase):
    """Exhaustive table-driven coverage of the composer contract."""

    def _assert(self, provider_explicit, safe, explicit, review, expected_decision):
        result = compose_policy(provider_explicit, safe, explicit, review)
        self.assertEqual(result.decision, expected_decision)
        self.assertTrue(result.reason)

    def test_provider_true_overrides_absolute_and_disallows_discovery(self):
        for safe, explicit, review in [
            (0.99, 0.0, 0.0),
            (0.0, 1.0, 1.0),
            (None, None, None),
        ]:
            with self.subTest(safe=safe, explicit=explicit, review=review):
                self._assert(True, safe, explicit, review, "explicit_or_sensitive")

    def test_provider_false_or_absent_never_certifies_safety(self):
        for flag in (False, None):
            self._assert(flag, 0.99, 0.0, 0.0, "safe_for_automatic_discovery")
            self._assert(flag, None, None, None, "needs_review")

    def test_safe_at_or_above_threshold_with_clean_signals_is_safe(self):
        self._assert(False, 0.75, 0.74, 0.74, "safe_for_automatic_discovery")
        self._assert(None, 0.9, 0.1, 0.0, "safe_for_automatic_discovery")

    def test_safe_below_threshold_fails_closed_to_needs_review(self):
        self._assert(False, 0.74, 0.0, 0.0, "needs_review")

    def test_explicit_at_or_above_threshold_fails_closed_to_explicit(self):
        self._assert(False, 0.99, 0.75, 0.0, "explicit_or_sensitive")
        self._assert(None, 0.0, 0.8, 0.0, "explicit_or_sensitive")

    def test_review_at_or_above_threshold_becomes_needs_review(self):
        self._assert(False, 0.99, 0.1, 0.75, "needs_review")
        self._assert(None, 0.9, 0.0, 0.9, "needs_review")

    def test_boundary_equality_counts_as_at_or_above(self):
        self._assert(False, 0.75, 0.7, 0.0, "safe_for_automatic_discovery")
        self._assert(False, 0.0, 0.75, 0.0, "explicit_or_sensitive")
        self._assert(False, 0.99, 0.0, 0.75, "needs_review")

    def test_contradictory_high_signals_fail_closed(self):
        self._assert(False, 0.99, 0.99, 0.0, "explicit_or_sensitive")
        self._assert(False, 0.99, 0.0, 0.99, "needs_review")

    def test_missing_incomplete_and_skipped_inputs_never_safe(self):
        for safe, explicit, review in [
            (None, None, None),
            (None, 0.1, 0.1),
            (0.99, None, 0.1),
            (0.99, 0.1, None),
        ]:
            with self.subTest(safe=safe, explicit=explicit, review=review):
                self._assert(False, safe, explicit, review, "needs_review")

    def test_invalid_probability_values_fail_closed_to_unknown(self):
        for safe, explicit, review in [
            (float("nan"), 0.0, 0.0),
            (0.5, float("inf"), 0.0),
            (0.5, 0.0, -0.1),
            ("0.9", 0.0, 0.0),
        ]:
            with self.subTest(safe=safe, explicit=explicit, review=review):
                self._assert(False, safe, explicit, review, "unknown")

    def test_threshold_validation_rejects_out_of_range(self):
        with self.assertRaises(ValueError):
            PolicyThresholds(safe_min=1.1)
        with self.assertRaises(ValueError):
            PolicyThresholds(explicit_at=-0.1)
        with self.assertRaises(ValueError):
            PolicyThresholds(review_at=float("nan"))

    def test_custom_thresholds_change_boundary_behavior(self):
        custom = PolicyThresholds(safe_min=0.5, explicit_at=0.9, review_at=0.9)
        self.assertEqual(
            compose_policy(False, 0.6, 0.0, 0.0, thresholds=custom).decision,
            "safe_for_automatic_discovery",
        )
        self.assertEqual(
            compose_policy(False, 0.85, 0.85, 0.0).decision,
            "explicit_or_sensitive",
        )


if __name__ == "__main__":
    unittest.main()
