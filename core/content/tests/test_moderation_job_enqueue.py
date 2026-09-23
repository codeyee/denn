"""Atomic outbox creation for persisted normalized moderation inputs."""
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings

from content.models import (
    ContentItem,
    ContentModerationJob,
    ContentModerationJudgment,
    SeasonDetail,
)
from content.services.local_content_store import ensure_content_detail
from content.services.moderation_job_enqueue import enqueue_current_moderation_job
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
        item = self.create_item(ContentItem.ContentType.MOVIE, 'provider-rule')
        ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
        ContentModerationJudgment.objects.create(
            content_item=item,
            source_data_hash=item.current_moderation_source_hash,
            model_name='provider-rule:v1',
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
        with self.assertRaises(RuntimeError):
            with transaction.atomic():
                ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
                raise RuntimeError('rollback transaction')

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
