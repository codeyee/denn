from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory
from drf_spectacular.generators import SchemaGenerator

from content.models import ContentItem, ContentModerationJudgment
from content.moderation.summary import (
    _source_hash,
    latest_moderation_prefetch,
    moderation_summary,
    with_moderation_summary,
)
from content.serializers import ContentItemSerializer, LocalContentSummarySerializer
from content.views.content_item import ContentItemDetailByIdView


class ModerationSummaryApiTests(TestCase):
    def setUp(self):
        self.item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.IGDB,
            external_id="moderation-summary-1",
            content_type=ContentItem.ContentType.GAME,
        )

    def create_judgment(
        self,
        *,
        status,
        classification,
        source_data_hash="hash-1",
        item=None,
    ):
        content_item = item or self.item
        ContentItem.objects.filter(pk=content_item.pk).update(
            current_moderation_source_hash=source_data_hash,
        )
        content_item.current_moderation_source_hash = source_data_hash
        return ContentModerationJudgment.objects.create(
            content_item=content_item,
            source_data_hash=source_data_hash,
            model_name="jev-1.13.0",
            question_revision="q3",
            status=status,
            classification=classification,
            payload={"raw_nouls": {"private": 0.9}, "usage": {"input_tokens": 5}},
            error_code="private_error_code",
        )

    def serialize(self, serializer, item=None):
        return serializer(item or self.item).data["moderation"]

    def test_missing_judgment_is_explicit(self):
        self.assertEqual(
            self.serialize(ContentItemSerializer),
            {"status": "missing", "classification": None},
        )

    def test_complete_allowlisted_classifications_are_summarized(self):
        cases = (
            (ContentModerationJudgment.Classification.SAFE, "safe"),
            (ContentModerationJudgment.Classification.EXPLICIT, "explicit"),
            (ContentModerationJudgment.Classification.NEEDS_REVIEW, "needs_review"),
        )
        for index, (raw_classification, public_classification) in enumerate(cases):
            with self.subTest(classification=raw_classification):
                item = ContentItem.objects.create(
                    source_api=ContentItem.SourceAPI.IGDB,
                    external_id=f"moderation-summary-{index + 2}",
                    content_type=ContentItem.ContentType.GAME,
                )
                ContentModerationJudgment.objects.create(
                    content_item=item,
                    source_data_hash="hash-1",
                    model_name="jev-1.13.0",
                    question_revision="q3",
                    status=ContentModerationJudgment.Status.COMPLETE,
                    classification=raw_classification,
                )
                ContentItem.objects.filter(pk=item.pk).update(
                    current_moderation_source_hash="hash-1",
                )
                item.current_moderation_source_hash = "hash-1"
                self.assertEqual(
                    self.serialize(ContentItemSerializer, item),
                    {
                        "status": "complete",
                        "classification": public_classification,
                    },
                )

    def test_pending_stale_and_error_never_expose_a_classification(self):
        cases = (
            (ContentModerationJudgment.Status.PENDING, "pending"),
            (ContentModerationJudgment.Status.STALE, "stale"),
            (ContentModerationJudgment.Status.ERROR, "error"),
        )
        for status, public_status in cases:
            with self.subTest(status=status):
                item = ContentItem.objects.create(
                    source_api=ContentItem.SourceAPI.IGDB,
                    external_id=f"moderation-state-{status}",
                    content_type=ContentItem.ContentType.GAME,
                )
                self.create_judgment(
                    status=status,
                    classification=ContentModerationJudgment.Classification.SAFE,
                    item=item,
                )
                self.assertEqual(
                    self.serialize(ContentItemSerializer, item),
                    {"status": public_status, "classification": None},
                )

    def test_unknown_classification_is_not_exposed_as_safe_or_invalid(self):
        self.create_judgment(
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.UNKNOWN,
        )
        item = ContentItem.objects.prefetch_related(
            "images",
            "content_authors",
        ).get(pk=self.item.pk)
        self.assertEqual(
            self.serialize(LocalContentSummarySerializer, item),
            {"status": "complete", "classification": None},
        )

    def test_invalid_persisted_values_fail_closed(self):
        self.create_judgment(
            status="processing",
            classification="safe_for_automatic_discovery",
        )
        self.assertEqual(
            self.serialize(ContentItemSerializer),
            {"status": "error", "classification": None},
        )

        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.IGDB,
            external_id="moderation-summary-invalid-classification",
            content_type=ContentItem.ContentType.GAME,
        )
        self.create_judgment(
            status="complete",
            classification="private_value",
            item=item,
        )
        self.assertEqual(
            self.serialize(ContentItemSerializer, item),
            {"status": "error", "classification": None},
        )

    def test_latest_requested_judgment_is_selected(self):
        earlier = self.create_judgment(
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
        )
        later = self.create_judgment(
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.EXPLICIT,
            source_data_hash="hash-2",
        )
        ContentModerationJudgment.objects.filter(pk=earlier.pk).update(
            requested_at=timezone.now() - timedelta(days=1)
        )
        ContentModerationJudgment.objects.filter(pk=later.pk).update(
            requested_at=timezone.now()
        )

        self.assertEqual(
            self.serialize(ContentItemSerializer),
            {"status": "complete", "classification": "explicit"},
        )

    def test_complete_judgment_is_stale_when_response_source_hash_differs(self):
        source_data = {"title": "Current title", "description": "Current description"}
        self.create_judgment(
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
        )

        summary = moderation_summary(self.item, source_data=source_data)

        self.assertEqual(summary, {"status": "stale", "classification": None})

    def test_complete_judgment_matches_source_hash_of_actual_response(self):
        source_data = {"title": "Current title", "description": "Current description"}
        judgment = self.create_judgment(
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
        )
        ContentModerationJudgment.objects.filter(pk=judgment.pk).update(
            source_data_hash=_source_hash(self.item, source_data)
        )
        ContentItem.objects.filter(pk=self.item.pk).update(
            current_moderation_source_hash=_source_hash(self.item, source_data)
        )
        self.item.refresh_from_db()

        summary = ContentItemSerializer(
            self.item,
            context={"source_data_cache": {self.item.id: source_data}},
        ).data["moderation"]

        self.assertEqual(summary, {"status": "complete", "classification": "safe"})

    def test_detail_api_compares_against_refreshed_response_payload(self):
        from unittest.mock import patch

        source_data = {"title": "Refreshed title", "description": "Refreshed text"}
        self.create_judgment(
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.EXPLICIT,
        )
        request = APIRequestFactory().get(f"/api/content/{self.item.pk}/")

        with patch(
            "content.services.source_data_orchestrator.fetch_bulk_source_data",
            return_value={self.item.pk: source_data},
        ):
            response = ContentItemDetailByIdView.as_view()(request, id=self.item.pk)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["moderation"],
            {"status": "stale", "classification": None},
        )
        self.assertEqual(response.data["source_data"], source_data)

    def test_annotated_summary_uses_source_hash_without_extra_query(self):
        source_data = {"title": "Current title", "description": "Current description"}
        judgment = self.create_judgment(
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.EXPLICIT,
        )
        ContentModerationJudgment.objects.filter(pk=judgment.pk).update(
            source_data_hash=_source_hash(self.item, source_data)
        )
        ContentItem.objects.filter(pk=self.item.pk).update(
            current_moderation_source_hash=_source_hash(self.item, source_data)
        )

        with self.assertNumQueries(1):
            item = with_moderation_summary(
                ContentItem.objects.filter(pk=self.item.pk)
            ).get()
            summary = moderation_summary(item, source_data=source_data)

        self.assertEqual(
            summary,
            {"status": "complete", "classification": "explicit"},
        )

    def test_summary_contains_only_public_fields(self):
        self.create_judgment(
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
        )
        summary = self.serialize(ContentItemSerializer)
        self.assertEqual(set(summary), {"status", "classification"})
        self.assertNotIn("private", str(summary))
        self.assertNotIn("hash-1", str(summary))
        self.assertNotIn("input_tokens", str(summary))
        self.assertNotIn("error_code", str(summary))

    def test_prefetch_keeps_list_serialization_query_bounded(self):
        second_item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.IGDB,
            external_id="moderation-summary-2",
            content_type=ContentItem.ContentType.GAME,
        )
        self.create_judgment(
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
        )
        queryset = (
            ContentItem.objects.filter(pk__in=(self.item.pk, second_item.pk))
            .select_related(
                "browse_meta",
                "movie_detail",
                "tv_show_detail",
                "season_detail__tv_show",
                "game_detail",
                "album_detail",
                "book_detail",
            )
            .prefetch_related(latest_moderation_prefetch())
            .order_by("pk")
        )
        items = list(queryset)

        with self.assertNumQueries(0):
            content_data = ContentItemSerializer(
                items,
                many=True,
                context={
                    "source_data_cache": {
                        self.item.id: {"title": "Changed title"},
                        second_item.id: {"title": "New title"},
                    }
                },
            ).data
            summary_data = LocalContentSummarySerializer(items, many=True).data

        self.assertEqual(
            [item["moderation"]["status"] for item in content_data],
            ["stale", "missing"],
        )
        self.assertEqual(
            [item["moderation"]["status"] for item in summary_data],
            ["complete", "missing"],
        )

    def test_annotation_reads_summary_without_an_additional_query(self):
        self.create_judgment(
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
        )
        with self.assertNumQueries(1):
            item = with_moderation_summary(
                ContentItem.objects.filter(pk=self.item.pk)
            ).get()
            summary = moderation_summary(item)

        self.assertEqual(
            summary,
            {"status": "complete", "classification": "safe"},
        )

    def test_annotation_marks_null_or_mismatched_current_hash_stale(self):
        judgment = self.create_judgment(
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
        )
        for current_hash in (None, "different-current-hash"):
            with self.subTest(current_hash=current_hash):
                ContentItem.objects.filter(pk=self.item.pk).update(
                    current_moderation_source_hash=current_hash,
                )
                with self.assertNumQueries(1):
                    item = with_moderation_summary(
                        ContentItem.objects.filter(pk=self.item.pk)
                    ).get()
                    summary = moderation_summary(item)
                self.assertEqual(
                    summary,
                    {"status": "stale", "classification": None},
                )
        self.assertIsNotNone(judgment.pk)

    def test_openapi_documents_summary_enums_and_field(self):
        schema = SchemaGenerator().get_schema(request=None, public=True)
        components = schema["components"]["schemas"]
        summary_component = next(
            component
            for component in components.values()
            if component.get("properties", {}).get("status", {}).get("enum")
            == ["missing", "pending", "complete", "stale", "error"]
        )
        classification = summary_component["properties"]["classification"]
        self.assertEqual(
            classification["enum"],
            ["safe", "explicit", "needs_review", None],
        )
        self.assertTrue(
            any(
                "moderation" in component.get("properties", {})
                for component in components.values()
            )
        )
