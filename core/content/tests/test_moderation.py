"""Tests for ContentModerationJudgment (JEV-001).

Covers model identity/idempotency, policy-revision history semantics,
status/classification enums, and the disabled-by-default configuration.
"""
from django.conf import settings
from django.contrib import admin
from django.db import IntegrityError, transaction
from django.test import TestCase

from content.models import ContentItem, ContentModerationJudgment


def _judgment_kwargs(item, **overrides):
    """Return kwargs for a complete judgment with the given item/identity."""
    kwargs = {
        "content_item": item,
        "source_data_hash": "hash-1",
        "model_name": "jev-1.13.0",
        "question_revision": "q1",
        "classification": ContentModerationJudgment.Classification.SAFE,
        "status": ContentModerationJudgment.Status.COMPLETE,
        "payload": {"explicit_or_sensitive": {"noul": 0.02}},
    }
    kwargs.update(overrides)
    return kwargs


class ContentModerationJudgmentModelTests(TestCase):
    def setUp(self):
        self.item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.IGDB,
            external_id="9001",
            content_type=ContentItem.ContentType.GAME,
        )

    def test_create_with_defaults(self):
        judgment = ContentModerationJudgment.objects.create(
            content_item=self.item,
            source_data_hash="hash-1",
            model_name="jev-1.13.0",
            question_revision="q1",
        )
        self.assertEqual(judgment.status, ContentModerationJudgment.Status.PENDING)
        self.assertEqual(
            judgment.classification, ContentModerationJudgment.Classification.UNKNOWN
        )
        self.assertIsNotNone(judgment.requested_at)
        self.assertIsNone(judgment.completed_at)
        self.assertEqual(judgment.payload, {})
        self.assertEqual(judgment.error_code, "")
        self.assertEqual(judgment.policy_revision, settings.MODERATION_POLICY_REVISION)

    def test_unique_identity_blocks_duplicate_inference(self):
        ContentModerationJudgment.objects.create(**_judgment_kwargs(self.item))
        with self.assertRaises(IntegrityError):
            ContentModerationJudgment.objects.create(**_judgment_kwargs(self.item))

    def test_same_identity_allows_update_not_second_row(self):
        judgment = ContentModerationJudgment.objects.create(**_judgment_kwargs(self.item))
        judgment.classification = ContentModerationJudgment.Classification.EXPLICIT
        judgment.save()
        self.assertEqual(
            ContentModerationJudgment.objects.filter(content_item=self.item).count(), 1
        )
        self.assertEqual(
            ContentModerationJudgment.objects.get(pk=judgment.pk).classification,
            ContentModerationJudgment.Classification.EXPLICIT,
        )

    def test_policy_revision_change_does_not_create_new_identity(self):
        # Policy revision is intentionally excluded from the identity
        # constraint: a policy change is re-evaluated from the stored raw
        # payload, never by inserting a second judgment for the same
        # content/model/input/question identity.
        ContentModerationJudgment.objects.create(
            **_judgment_kwargs(self.item, policy_revision="p1")
        )
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                ContentModerationJudgment.objects.create(
                    **_judgment_kwargs(self.item, policy_revision="p2")
                )
        self.assertEqual(ContentModerationJudgment.objects.count(), 1)

    def test_changed_source_creates_history_row(self):
        ContentModerationJudgment.objects.create(
            **_judgment_kwargs(self.item, source_data_hash="hash-old")
        )
        latest = ContentModerationJudgment.objects.create(
            **_judgment_kwargs(self.item, source_data_hash="hash-new")
        )
        hashes = list(
            ContentModerationJudgment.objects.filter(content_item=self.item)
            .order_by("pk")
            .values_list("source_data_hash", flat=True)
        )
        self.assertEqual(hashes, ["hash-old", "hash-new"])
        self.assertGreater(latest.pk, ContentModerationJudgment.objects.first().pk)

    def test_question_revision_change_is_new_identity(self):
        ContentModerationJudgment.objects.create(
            **_judgment_kwargs(self.item, question_revision="q1")
        )
        ContentModerationJudgment.objects.create(
            **_judgment_kwargs(self.item, question_revision="q2")
        )
        self.assertEqual(ContentModerationJudgment.objects.count(), 2)

    def test_failure_judgment_has_no_completed_at(self):
        judgment = ContentModerationJudgment.objects.create(
            **_judgment_kwargs(
                self.item,
                status=ContentModerationJudgment.Status.ERROR,
                classification=ContentModerationJudgment.Classification.UNKNOWN,
                error_code="typesafe_timeout",
            )
        )
        self.assertEqual(judgment.status, ContentModerationJudgment.Status.ERROR)
        self.assertEqual(judgment.error_code, "typesafe_timeout")
        self.assertIsNone(judgment.completed_at)

    def test_no_aggregate_confidence_field(self):
        fields = {f.name for f in ContentModerationJudgment._meta.get_fields()}
        self.assertNotIn("confidence", fields)

    def test_indexes_and_constraint_registered(self):
        meta = ContentModerationJudgment._meta
        index_names = {ix.name for ix in meta.indexes}
        constraint_names = {c.name for c in meta.constraints}
        self.assertIn("moderation_item_status_idx", index_names)
        self.assertIn("moderation_status_class_idx", index_names)
        self.assertIn("unique_moderation_judgment_identity", constraint_names)

    def test_string_representation(self):
        judgment = ContentModerationJudgment.objects.create(**_judgment_kwargs(self.item))
        expected = f"ModerationJudgment({self.item.id}:jev-1.13.0:q1:complete)"
        self.assertEqual(str(judgment), expected)


class ModerationConfigurationTests(TestCase):
    def test_classification_disabled_by_default(self):
        self.assertFalse(settings.MODERATION_CLASSIFICATION_ENABLED)

    def test_shadow_policy_mode(self):
        self.assertEqual(settings.MODERATION_POLICY_MODE, "shadow")

    def test_model_question_and_policy_revisions_present(self):
        self.assertEqual(settings.MODERATION_MODEL, "jev-latest")
        self.assertEqual(settings.MODERATION_QUESTION_REVISION, "q2")
        self.assertTrue(settings.MODERATION_POLICY_REVISION)

    def test_api_key_not_required_when_disabled(self):
        # Importing settings must never fail while classification is disabled;
        # there is no required TYPESAFE_API_KEY read at import time.
        self.assertFalse(settings.MODERATION_CLASSIFICATION_ENABLED)
        self.assertNotIn("TYPESAFE_API_KEY", dir(settings))


class ModerationAdminTests(TestCase):
    def test_model_is_registered_in_admin(self):
        self.assertIn(ContentModerationJudgment, admin.site._registry)
