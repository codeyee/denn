"""Atomic outbox creation for persisted normalized moderation inputs."""
from unittest.mock import Mock

from django.contrib.auth import get_user_model
from django.db import IntegrityError, connection, transaction
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from content.models import (
    ContentItem,
    ContentMetadataPreparationCursor,
    ContentMetadataPreparationJob,
    ContentModerationJob,
    ContentModerationJudgment,
    SeasonDetail,
)
from content.services.local_content_store import ensure_content_detail
from content.services.moderation_job_enqueue import (
    enqueue_current_moderation_job,
    enqueue_missing_moderation_jobs,
)
from content.services.moderation_job_worker import run_moderation_batch
from content.tests.fixtures.payloads import MOVIE_MEMENTO, SEASON_DEMON_SLAYER_S01, TV_DEMON_SLAYER


ENABLED = override_settings(
    MODERATION_CLASSIFICATION_ENABLED=True,
    MODERATION_MODEL='jev-latest',
    MODERATION_QUESTION_REVISION='q3',
)


class ModerationJobEnqueueTests(TestCase):
    def create_item(self, content_type, suffix, *, source_api=ContentItem.SourceAPI.TMDB):
        return ContentItem.objects.create(
            source_api=source_api,
            external_id=f'moderation-outbox-{content_type}-{suffix}',
            content_type=content_type,
        )

    @ENABLED
    def test_identity_creation_and_missing_detail_do_not_enqueue(self):
        item = self.create_item(ContentItem.ContentType.MOVIE, 'identity')
        self.assertFalse(ContentModerationJob.objects.exists())

        with transaction.atomic():
            self.assertIsNone(enqueue_current_moderation_job(item, None))
        self.assertFalse(ContentModerationJob.objects.exists())

    @ENABLED
    def test_detail_write_enqueues_one_job_and_unchanged_refresh_coalesces(self):
        item = self.create_item(ContentItem.ContentType.MOVIE, 'same')
        ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
        job = ContentModerationJob.objects.get(content_item=item)
        self.assertEqual(job.status, ContentModerationJob.Status.QUEUED)
        self.assertEqual(job.source_data_hash, item.current_moderation_source_hash)
        self.assertEqual(job.requested_model, 'jev-latest')
        self.assertEqual(job.question_revision, 'q3')

        ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
        self.assertEqual(ContentModerationJob.objects.filter(content_item=item).count(), 1)
        job.refresh_from_db()
        self.assertEqual(job.status, ContentModerationJob.Status.QUEUED)

    @ENABLED
    def test_changed_hash_supersedes_older_queued_job_and_enqueues_new_identity(self):
        item = self.create_item(ContentItem.ContentType.MOVIE, 'changed')
        ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
        old_job = ContentModerationJob.objects.get(content_item=item)
        changed = {**MOVIE_MEMENTO, 'description': 'A different moderation-relevant description.'}

        ensure_content_detail(item, payload=changed, force=True)
        old_job.refresh_from_db()
        self.assertEqual(old_job.status, ContentModerationJob.Status.SUPERSEDED)
        new_job = ContentModerationJob.objects.exclude(pk=old_job.pk).get(content_item=item)
        self.assertEqual(new_job.status, ContentModerationJob.Status.QUEUED)
        self.assertEqual(new_job.source_data_hash, item.current_moderation_source_hash)

    @ENABLED
    def test_existing_success_for_requested_alias_does_not_enqueue(self):
        item = self.create_item(ContentItem.ContentType.MOVIE, 'judged')
        ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
        ContentModerationJudgment.objects.create(
            content_item=item,
            source_data_hash=item.current_moderation_source_hash,
            model_name='jev-1.13.0',
            question_revision='q3',
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
            payload={'requested_model': 'jev-latest'},
        )

        # A later unchanged detail refresh must also avoid creating work.
        ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
        self.assertEqual(
            ContentModerationJob.objects.get(content_item=item).status,
            ContentModerationJob.Status.DONE,
        )

    @ENABLED
    def test_existing_provider_rule_success_does_not_enqueue(self):
        # Rows written by the earlier rule stay valid history beside the current one.
        for rule in ('provider-rule:v1', 'provider-rule:v2'):
            with self.subTest(rule=rule):
                item = self.create_item(ContentItem.ContentType.MOVIE, rule[-2:])
                ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
                ContentModerationJudgment.objects.create(
                    content_item=item,
                    source_data_hash=item.current_moderation_source_hash,
                    model_name=rule,
                    question_revision='q3',
                    status=ContentModerationJudgment.Status.COMPLETE,
                    classification=ContentModerationJudgment.Classification.EXPLICIT,
                )

                ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
                self.assertEqual(
                    ContentModerationJob.objects.get(content_item=item).status,
                    ContentModerationJob.Status.DONE,
                )

    @override_settings(MODERATION_CLASSIFICATION_ENABLED=False)
    def test_disabled_classification_does_not_enqueue(self):
        item = self.create_item(ContentItem.ContentType.MOVIE, 'disabled')
        ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
        self.assertTrue(item.current_moderation_source_hash)
        self.assertFalse(ContentModerationJob.objects.filter(content_item=item).exists())

    @ENABLED
    def test_job_and_detail_roll_back_together(self):
        item = self.create_item(ContentItem.ContentType.MOVIE, 'rollback')

        def write_detail_then_fail():
            with transaction.atomic():
                ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
                raise RuntimeError('rollback transaction')

        self.assertRaises(RuntimeError, write_detail_then_fail)
        item.refresh_from_db()
        self.assertIsNone(item.current_moderation_source_hash)
        self.assertFalse(ContentModerationJob.objects.filter(content_item=item).exists())

    @ENABLED
    def test_job_identity_constraint_rejects_duplicate_rows(self):
        item = self.create_item(ContentItem.ContentType.MOVIE, 'unique')
        ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
        job = ContentModerationJob.objects.get(content_item=item)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ContentModerationJob.objects.create(
                    content_item=item,
                    source_data_hash=job.source_data_hash,
                    requested_model=job.requested_model,
                    question_revision=job.question_revision,
                    available_at=job.available_at,
                )

    @ENABLED
    def test_parent_title_change_rehashes_and_queues_inherited_season(self):
        show_payload = {key: value for key, value in TV_DEMON_SLAYER.items() if key != 'seasons'}
        show = self.create_item(ContentItem.ContentType.TV_SHOW, 'season-parent')
        ensure_content_detail(show, payload=show_payload, force=True)
        season_payload = dict(SEASON_DEMON_SLAYER_S01)
        season_payload.pop('tv_show_name', None)
        season = self.create_item(
            ContentItem.ContentType.SEASON,
            'season-child',
        )
        season.external_id = f'{show.external_id}:1'
        season.save(update_fields=('external_id',))
        ensure_content_detail(season, payload=season_payload, force=True)
        season_detail = SeasonDetail.objects.get(content_item=season)
        self.assertEqual(season_detail.tv_show_id, show.pk)
        self.assertEqual(season_detail.tv_show_name, '')
        old_hash = season.current_moderation_source_hash
        old_job = ContentModerationJob.objects.get(content_item=season, source_data_hash=old_hash)

        ensure_content_detail(
            show,
            payload={**show_payload, 'title': 'Renamed series'},
            force=True,
        )

        season.refresh_from_db()
        self.assertNotEqual(season.current_moderation_source_hash, old_hash)
        old_job.refresh_from_db()
        self.assertEqual(old_job.status, ContentModerationJob.Status.SUPERSEDED)
        self.assertTrue(
            ContentModerationJob.objects.filter(
                content_item=season,
                source_data_hash=season.current_moderation_source_hash,
                status=ContentModerationJob.Status.QUEUED,
            ).exists()
        )

    @ENABLED
    def test_nested_season_write_uses_outbox(self):
        show = self.create_item(ContentItem.ContentType.TV_SHOW, 'nested')
        nested_season = {
            **SEASON_DEMON_SLAYER_S01,
            'tv_show_name': TV_DEMON_SLAYER['title'],
        }
        ensure_content_detail(
            show,
            payload={**TV_DEMON_SLAYER, 'seasons': [nested_season]},
            force=True,
        )
        season = ContentItem.objects.get(
            source_api=show.source_api,
            external_id=f'{show.external_id}:1',
            content_type=ContentItem.ContentType.SEASON,
        )
        self.assertTrue(
            ContentModerationJob.objects.filter(
                content_item=season,
                source_data_hash=season.current_moderation_source_hash,
            ).exists()
        )


class BulkResolveModerationAdmissionTests(APITestCase):
    """The strict homepage heals through the bulk resolver, never per item."""

    def setUp(self):
        ContentMetadataPreparationCursor.objects.get_or_create(pk=1)
        self.client.force_authenticate(
            user=get_user_model().objects.create_user(username='resolver', password='p'),
        )
        self.url = reverse('content:content-resolve-ids')

    def prepared_item(self, suffix):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id=f'resolver-admission-{suffix}',
            content_type=ContentItem.ContentType.MOVIE,
        )
        with override_settings(MODERATION_CLASSIFICATION_ENABLED=False):
            ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
        item.refresh_from_db()
        self.assertTrue(item.current_moderation_source_hash)
        self.assertFalse(ContentModerationJob.objects.filter(content_item=item).exists())
        return item

    def resolve(self, *items):
        response = self.client.post(
            self.url,
            {'items': [{
                'source_api': item.source_api,
                'external_id': item.external_id,
                'content_type': item.content_type,
            } for item in items]},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        return response

    def job_statements(self, *items):
        with CaptureQueriesContext(connection) as captured:
            self.resolve(*items)
        return [
            query['sql'] for query in captured.captured_queries
            if 'content_moderation_job' in query['sql'].lower()
        ]

    @override_settings(MODERATION_CLASSIFICATION_ENABLED=False)
    def test_disabled_classification_writes_and_reads_nothing(self):
        item = self.prepared_item('disabled')
        legacy = self.prepared_item('disabled-legacy')
        ContentItem.objects.filter(pk=legacy.pk).update(current_moderation_source_hash=None)

        self.assertEqual(self.job_statements(item, legacy), [])
        self.assertFalse(ContentModerationJob.objects.exists())
        self.assertFalse(ContentMetadataPreparationJob.objects.exists())
        with self.assertNumQueries(0):
            self.assertEqual(enqueue_missing_moderation_jobs([item]), 0)

    @ENABLED
    def test_missing_detail_admits_preparation_only(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='resolver-admission-no-detail',
            content_type=ContentItem.ContentType.MOVIE,
        )

        self.resolve(item)

        self.assertTrue(ContentMetadataPreparationJob.objects.filter(content_item=item).exists())
        self.assertFalse(ContentModerationJob.objects.exists())

    @ENABLED
    def test_detail_without_current_hash_admits_preparation_only(self):
        item = self.prepared_item('null-hash')
        ContentItem.objects.filter(pk=item.pk).update(current_moderation_source_hash=None)

        self.resolve(item)

        self.assertTrue(ContentMetadataPreparationJob.objects.filter(content_item=item).exists())
        self.assertFalse(ContentModerationJob.objects.exists())

    @ENABLED
    def test_hash_without_judgment_queues_exactly_one_job_and_repeats_are_idempotent(self):
        item = self.prepared_item('unjudged')

        self.resolve(item)
        self.resolve(item)

        job = ContentModerationJob.objects.get(content_item=item)
        self.assertEqual(job.status, ContentModerationJob.Status.QUEUED)
        self.assertEqual(job.source_data_hash, item.current_moderation_source_hash)
        self.assertEqual((job.requested_model, job.question_revision), ('jev-latest', 'q3'))
        self.assertFalse(ContentMetadataPreparationJob.objects.filter(content_item=item).exists())

    @ENABLED
    def test_current_successful_judgment_queues_nothing(self):
        item = self.prepared_item('judged')
        ContentModerationJudgment.objects.create(
            content_item=item,
            source_data_hash=item.current_moderation_source_hash,
            model_name='jev-1.13.0',
            question_revision='q3',
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
            payload={'requested_model': 'jev-latest'},
        )

        self.resolve(item)

        self.assertFalse(ContentModerationJob.objects.exists())

    @ENABLED
    def test_judgment_for_another_question_revision_is_not_current(self):
        item = self.prepared_item('older-revision')
        ContentModerationJudgment.objects.create(
            content_item=item,
            source_data_hash=item.current_moderation_source_hash,
            model_name='jev-1.13.0',
            question_revision='q2',
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
            payload={'requested_model': 'jev-latest'},
        )

        self.resolve(item)

        self.assertEqual(ContentModerationJob.objects.filter(content_item=item).count(), 1)

    @ENABLED
    def test_existing_job_identity_is_never_requeued_in_any_status(self):
        for status in (
            ContentModerationJob.Status.FAILED,
            ContentModerationJob.Status.OUTCOME_UNKNOWN,
            ContentModerationJob.Status.DONE,
            ContentModerationJob.Status.SUPERSEDED,
        ):
            with self.subTest(status=status):
                item = self.prepared_item(f'existing-{status}')
                job = ContentModerationJob.objects.create(
                    content_item=item,
                    source_data_hash=item.current_moderation_source_hash,
                    requested_model='jev-latest',
                    question_revision='q3',
                    status=status,
                    available_at=timezone.now(),
                )

                self.resolve(item)

                job.refresh_from_db()
                self.assertEqual(job.status, status)
                self.assertEqual(ContentModerationJob.objects.filter(content_item=item).count(), 1)

    @ENABLED
    def test_changed_hash_queues_a_new_identity(self):
        item = self.prepared_item('changed')
        self.resolve(item)
        ContentItem.objects.filter(pk=item.pk).update(current_moderation_source_hash='changed-hash')

        self.resolve(item)

        self.assertEqual(
            set(ContentModerationJob.objects.filter(content_item=item).values_list(
                'source_data_hash', flat=True,
            )),
            {item.current_moderation_source_hash, 'changed-hash'},
        )

    @ENABLED
    def test_outdated_hash_is_admitted_once_then_superseded_and_never_readmitted(self):
        item = self.prepared_item('outdated')
        ContentItem.objects.filter(pk=item.pk).update(current_moderation_source_hash='e' * 64)
        classifier = Mock(side_effect=AssertionError('must not classify an outdated hash'))

        self.resolve(item)
        result = run_moderation_batch(classifier=classifier)
        self.resolve(item)
        self.resolve(item)

        job = ContentModerationJob.objects.get(content_item=item)
        self.assertEqual(result.counts['superseded'], 1)
        self.assertEqual(job.status, ContentModerationJob.Status.SUPERSEDED)
        self.assertEqual(job.source_data_hash, 'e' * 64)
        classifier.assert_not_called()

    @ENABLED
    def test_admission_query_budget_does_not_depend_on_item_count(self):
        single = self.job_statements(self.prepared_item('budget-single'))
        many = self.job_statements(*[self.prepared_item(f'budget-{index}') for index in range(8)])

        self.assertEqual(len(single), len(many))
        self.assertEqual(
            sorted(sql.split(None, 1)[0].upper() for sql in many),
            ['INSERT', 'SELECT'],
        )
        self.assertEqual(ContentModerationJob.objects.count(), 9)
