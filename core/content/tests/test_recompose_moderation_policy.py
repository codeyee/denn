"""Tests for the recompose_moderation_policy command (offline, no Jev client)."""
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase, override_settings

from content.models import ContentItem, ContentModerationJudgment
from content.services.moderation_service import PROVIDER_RULE_MODEL

Classification = ContentModerationJudgment.Classification


def _raw(safe, explicit, review):
    return {
        "safe_for_automatic_discovery": safe,
        "explicit_or_sensitive": explicit,
        "needs_review": review,
    }


@override_settings(MODERATION_POLICY_REVISION="p2")
class RecomposeModerationPolicyTests(TestCase):
    def setUp(self):
        self._n = 0

    def _judgment(self, raw, *, classification=Classification.NEEDS_REVIEW,
                  revision="p1", model="jev-1.13.0", payload_extra=None):
        self._n += 1
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.IGDB,
            external_id=str(self._n),
            content_type=ContentItem.ContentType.GAME,
        )
        payload = {"raw_nouls": raw, "provider_explicit": None, "usage": {"input_tokens": 1}}
        payload.update(payload_extra or {})
        return ContentModerationJudgment.objects.create(
            content_item=item,
            source_data_hash="h",
            model_name=model,
            question_revision="q4",
            policy_revision=revision,
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=classification,
            payload=payload,
        )

    def _run(self, *args):
        out = StringIO()
        with patch("content.moderation.client.JevModerationClient") as client:
            call_command("recompose_moderation_policy", *args, stdout=out)
            client.assert_not_called()
        return out.getvalue()

    def test_dry_run_writes_nothing(self):
        j = self._judgment(_raw(0.9, 0.6, 0.1))
        output = self._run()
        j.refresh_from_db()
        self.assertEqual(j.classification, Classification.NEEDS_REVIEW)
        self.assertEqual(j.policy_revision, "p1")
        self.assertIn("mode=dry-run", output)
        self.assertIn("selected=1", output)
        self.assertIn("needs_review -> explicit_or_sensitive: 1", output)

    def test_apply_transitions_to_explicit_and_updates_fields(self):
        j_review = self._judgment(_raw(0.4, 0.6, 0.2))
        j_safe = self._judgment(_raw(0.9, 0.6, 0.1), classification=Classification.SAFE)
        before = j_review.payload["raw_nouls"], j_review.completed_at, j_review.model_name
        output = self._run("--apply")
        for j in (j_review, j_safe):
            j.refresh_from_db()
            self.assertEqual(j.classification, Classification.EXPLICIT)
            self.assertEqual(j.policy_revision, "p2")
            self.assertEqual(
                j.payload["policy"],
                {"decision": "explicit_or_sensitive", "reason": "jev_explicit_at_or_above_threshold"},
            )
            self.assertEqual(
                j.payload["policy_thresholds"],
                {"safe_min": 0.75, "explicit_at": 0.55, "review_at": 0.75},
            )
        self.assertEqual((j_review.payload["raw_nouls"], j_review.completed_at, j_review.model_name), before)
        self.assertEqual(j_review.payload["usage"], {"input_tokens": 1})
        self.assertIn("updated=2", output)

    def test_provider_rule_rows_are_untouched_and_counted(self):
        j = self._judgment(
            {}, classification=Classification.EXPLICIT, model=PROVIDER_RULE_MODEL,
            payload_extra={"provider_explicit": True},
        )
        output = self._run("--apply", "--all")
        j.refresh_from_db()
        self.assertEqual(j.policy_revision, "p1")
        self.assertEqual(j.payload["raw_nouls"], {})
        self.assertIn("skipped_provider_rule=1", output)

    def test_current_revision_skipped_unless_all(self):
        j = self._judgment(_raw(0.9, 0.6, 0.1), revision="p2")
        output = self._run("--apply")
        j.refresh_from_db()
        self.assertEqual(j.classification, Classification.NEEDS_REVIEW)
        self.assertIn("skipped_current_revision=1", output)
        output = self._run("--apply", "--all")
        j.refresh_from_db()
        self.assertEqual(j.classification, Classification.EXPLICIT)
        self.assertIn("updated=1", output)

    def test_second_apply_changes_nothing(self):
        self._judgment(_raw(0.9, 0.6, 0.1))
        self._run("--apply")
        snapshot = list(ContentModerationJudgment.objects.values("id", "classification", "policy_revision", "payload"))
        output = self._run("--apply")
        self.assertIn("updated=0", output)
        self.assertIn("selected=0", output)
        output = self._run("--apply", "--all")
        self.assertIn("updated=0", output)
        self.assertIn("unchanged=1", output)
        self.assertEqual(
            snapshot,
            list(ContentModerationJudgment.objects.values("id", "classification", "policy_revision", "payload")),
        )

    def test_malformed_raw_nouls_are_skipped_and_counted(self):
        missing = self._judgment({"explicit_or_sensitive": 0.9})
        non_number = self._judgment(_raw(0.9, "high", 0.1))
        empty = self._judgment({})
        output = self._run("--apply")
        self.assertIn("skipped_malformed_raw_nouls=3", output)
        self.assertIn("selected=0", output)
        for j in (missing, non_number, empty):
            j.refresh_from_db()
            self.assertEqual(j.policy_revision, "p1")

    def test_non_complete_rows_are_ignored(self):
        j = self._judgment(_raw(0.9, 0.6, 0.1))
        ContentModerationJudgment.objects.filter(pk=j.pk).update(
            status=ContentModerationJudgment.Status.STALE
        )
        output = self._run("--apply")
        self.assertIn("examined=0", output)

    def test_small_batch_size_processes_everything(self):
        for _ in range(5):
            self._judgment(_raw(0.9, 0.6, 0.1))
        output = self._run("--apply", "--batch-size", "2")
        self.assertIn("updated=5", output)
        self.assertEqual(
            ContentModerationJudgment.objects.filter(classification=Classification.EXPLICIT).count(), 5
        )

    def test_output_has_no_payload_contents(self):
        self._judgment(_raw(0.9, 0.6, 0.1), payload_extra={"source_state": {"title": "SECRET-TITLE"}})
        self.assertNotIn("SECRET-TITLE", self._run("--apply"))
