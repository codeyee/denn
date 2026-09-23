"""Offline coverage for bounded identity metadata preparation."""
from datetime import timedelta
from io import StringIO
from unittest.mock import Mock, patch

from django.core.management import call_command
from django.db import connection
from django.test import TransactionTestCase, override_settings
from django.utils import timezone

from content.models import (
    ContentItem,
    ContentMetadataPreparationJob,
    ContentModerationJob,
    MovieDetail,
)
from content.services.local_content_store import ensure_content_detail
from content.services.metadata_preparation_worker import (
    claim_metadata_preparation_jobs,
    run_metadata_preparation_batch,
)
from content.services.moderation_service import build_state_and_hash
from content.services.source_data_orchestrator import fetch_bulk_source_data
from content.tests.fixtures.payloads import MOVIE_MEMENTO


MODERATION_SETTINGS = override_settings(
    MODERATION_CLASSIFICATION_ENABLED=True,
    MODERATION_MODEL='jev-latest',
    MODERATION_QUESTION_REVISION='q3',
)


class MetadataPreparationWorkerTests(TransactionTestCase):
    def create_job(self, suffix):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id=f'metadata-worker-{suffix}',
            content_type=ContentItem.ContentType.MOVIE,
        )
        job = ContentMetadataPreparationJob.objects.create(
            content_item=item,
            status=ContentMetadataPreparationJob.Status.QUEUED,
            available_at=timezone.now(),
        )
        return item, job

    def test_existing_normalized_detail_completes_without_fetch(self):
        item, job = self.create_job('already-present')
        payload = dict(MOVIE_MEMENTO, id=item.external_id)
        ensure_content_detail(item, payload=payload, force=True)
        fetcher = Mock(side_effect=AssertionError('existing detail must not fetch'))

        result = run_metadata_preparation_batch(fetcher=fetcher)

        job.refresh_from_db()
        self.assertEqual(result.counts, {'done': 1})
        self.assertEqual(job.status, ContentMetadataPreparationJob.Status.DONE)
        fetcher.assert_not_called()

    @MODERATION_SETTINGS
    def test_canonical_fetch_persists_detail_hash_and_moderation_outbox(self):
        item, job = self.create_job('fetch')
        payload = dict(MOVIE_MEMENTO, id=item.external_id, title='Memento prepared')

        def fetch_without_transaction(items):
            self.assertFalse(connection.in_atomic_block)
            return fetch_bulk_source_data(items)

        with patch('content.services.source_data_orchestrator._proxy_fetch') as proxy:
            proxy.return_value = {item.pk: payload}
            result = run_metadata_preparation_batch(fetcher=fetch_without_transaction)

        item.refresh_from_db()
        job.refresh_from_db()
        self.assertEqual(result.counts, {'done': 1})
        self.assertEqual(item.movie_detail.title, 'Memento prepared')
        self.assertEqual(item.current_moderation_source_hash, build_state_and_hash(item)[1])
        self.assertTrue(ContentModerationJob.objects.filter(
            content_item=item,
            source_data_hash=item.current_moderation_source_hash,
            status=ContentModerationJob.Status.QUEUED,
        ).exists())
        proxy.assert_called_once()

    def test_empty_and_malformed_results_retry_without_creating_detail(self):
        item, job = self.create_job('empty')
        result = run_metadata_preparation_batch(fetcher=lambda _items: {})
        job.refresh_from_db()
        self.assertEqual(result.counts, {'retry': 1})
        self.assertEqual(job.status, ContentMetadataPreparationJob.Status.RETRY)
        self.assertFalse(MovieDetail.objects.filter(content_item=item).exists())

        item2, job2 = self.create_job('malformed')
        with patch('content.services.source_data_orchestrator._proxy_fetch') as proxy:
            proxy.return_value = {item2.pk: {'id': item2.external_id, 'type': 'book'}}
            result = run_metadata_preparation_batch()
        job2.refresh_from_db()
        self.assertEqual(result.counts, {'retry': 1})
        self.assertEqual(job2.status, ContentMetadataPreparationJob.Status.RETRY)
        self.assertFalse(MovieDetail.objects.filter(content_item=item2).exists())

    def test_retry_exhaustion_is_terminal_and_uses_bounded_error_code(self):
        item, job = self.create_job('exhausted')
        result = run_metadata_preparation_batch(
            max_attempts=1,
            fetcher=lambda _items: {},
        )
        job.refresh_from_db()
        self.assertEqual(result.counts, {'failed': 1})
        self.assertEqual(job.status, ContentMetadataPreparationJob.Status.FAILED)
        self.assertEqual(job.last_error_code, 'canonical_metadata_unavailable')
        self.assertIsNotNone(job.completed_at)
        self.assertFalse(MovieDetail.objects.filter(content_item=item).exists())

    def test_active_claim_is_not_reclaimed_and_stale_completion_is_fenced(self):
        _item, job = self.create_job('fence')
        _claimed_id, old_token = claim_metadata_preparation_jobs(batch_size=1)[0]
        self.assertEqual(claim_metadata_preparation_jobs(batch_size=1), [])

        def expire_and_reclaim(_items):
            active_token = ContentMetadataPreparationJob.objects.get(pk=job.pk).lease_token
            ContentMetadataPreparationJob.objects.filter(pk=job.pk).update(
                lease_until=timezone.now() - timedelta(seconds=1),
            )
            new_claim = claim_metadata_preparation_jobs(batch_size=1)
            self.assertEqual(len(new_claim), 1)
            self.assertNotEqual(new_claim[0][1], active_token)
            return {}

        # Drive a stale worker completion with the lease actually held by the
        # batch, while a second worker reclaims the expired job.
        ContentMetadataPreparationJob.objects.filter(pk=job.pk).update(
            status=ContentMetadataPreparationJob.Status.QUEUED,
            lease_token=None,
            lease_until=None,
        )
        result = run_metadata_preparation_batch(fetcher=expire_and_reclaim)
        job.refresh_from_db()
        self.assertEqual(result.counts, {'fenced': 1})
        self.assertEqual(job.status, ContentMetadataPreparationJob.Status.LEASED)
        self.assertNotEqual(job.lease_token, old_token)

    def test_claim_enforces_batch_bound(self):
        with self.assertRaises(ValueError):
            claim_metadata_preparation_jobs(batch_size=101)

    def test_one_shot_command_emits_aggregate_and_exits(self):
        output = StringIO()
        call_command('run_metadata_preparation_worker', '--once', stdout=output, verbosity=0)
        self.assertIn('metadata_preparation_worker: counts={}', output.getvalue())
