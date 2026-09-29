"""Offline tests for bounded incremental moderation job processing."""
from datetime import timedelta
from unittest.mock import Mock

from django.db import connection
from django.test import TransactionTestCase, override_settings
from django.utils import timezone

from content.models import ContentItem, ContentModerationJob, ContentModerationJudgment
from content.services.local_content_store import ensure_content_detail
from content.services.moderation_job_worker import (
    claim_moderation_jobs,
    expire_ambiguous_leases,
    process_claim,
    run_moderation_batch,
)
from content.services.moderation_service import ModerationClassificationOutcome
from content.tests.fixtures.payloads import MOVIE_MEMENTO


WORKER_SETTINGS = override_settings(
    MODERATION_CLASSIFICATION_ENABLED=True,
    MODERATION_MODEL='jev-latest',
    MODERATION_QUESTION_REVISION='q3',
)


class ModerationJobWorkerTests(TransactionTestCase):
    def create_job(self, suffix):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id=f'moderation-worker-{suffix}',
            content_type=ContentItem.ContentType.MOVIE,
        )
        ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
        return item, ContentModerationJob.objects.get(content_item=item)

    @staticmethod
    def save_success(item, source_hash, requested_model='jev-latest'):
        return ContentModerationJudgment.objects.create(
            content_item=item,
            source_data_hash=source_hash,
            model_name='jev-1.13.0',
            question_revision='q3',
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
            payload={'requested_model': requested_model},
        )

    @WORKER_SETTINGS
    def test_once_claims_and_completes_fresh_job_without_database_lock_during_call(self):
        item, job = self.create_job('fresh')
        called = []

        def fake_classifier(content_item, *, model):
            self.assertFalse(connection.in_atomic_block)
            self.assertEqual(content_item.pk, item.pk)
            self.assertEqual(model, 'jev-latest')
            judgment = self.save_success(item, job.source_data_hash)
            called.append(judgment.pk)
            return judgment

        result = run_moderation_batch(classifier=fake_classifier)

        job.refresh_from_db()
        self.assertEqual(result.counts['done'], 1)
        self.assertEqual(len(called), 1)
        self.assertEqual(job.status, ContentModerationJob.Status.DONE)
        self.assertIsNone(job.lease_token)

    @WORKER_SETTINGS
    def test_stale_source_hash_is_superseded_without_classification(self):
        item, job = self.create_job('stale')
        item.current_moderation_source_hash = 'newer-persisted-hash'
        item.save(update_fields=('current_moderation_source_hash',))
        classifier = Mock(side_effect=AssertionError('must not classify stale input'))

        result = run_moderation_batch(classifier=classifier)

        job.refresh_from_db()
        self.assertEqual(result.counts['superseded'], 1)
        classifier.assert_not_called()
        self.assertEqual(job.status, ContentModerationJob.Status.SUPERSEDED)

    @WORKER_SETTINGS
    def test_source_change_during_classification_supersedes_result(self):
        item, job = self.create_job('changed-in-flight')

        def fake_classifier(content_item, *, model):
            judgment = self.save_success(item, job.source_data_hash)
            content_item.current_moderation_source_hash = 'newer-hash-during-call'
            content_item.save(update_fields=('current_moderation_source_hash',))
            return judgment

        result = run_moderation_batch(classifier=fake_classifier)

        job.refresh_from_db()
        self.assertEqual(result.counts['superseded'], 1)
        self.assertEqual(job.status, ContentModerationJob.Status.SUPERSEDED)

    @WORKER_SETTINGS
    def test_existing_current_alias_judgment_is_reused_without_classifier_call(self):
        item, job = self.create_job('reuse')
        self.save_success(item, job.source_data_hash)
        classifier = Mock(side_effect=AssertionError('must reuse current judgment'))

        result = run_moderation_batch(classifier=classifier)

        job.refresh_from_db()
        self.assertEqual(result.counts['reused'], 1)
        classifier.assert_not_called()
        self.assertEqual(job.status, ContentModerationJob.Status.DONE)

    @WORKER_SETTINGS
    def test_wrong_lease_token_cannot_complete_job(self):
        _item, job = self.create_job('fence')
        claims = claim_moderation_jobs(batch_size=1, lease_seconds=60)
        claimed_id, real_token = claims[0]

        result = process_claim(
            claimed_id,
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            classifier=Mock(),
        )

        job.refresh_from_db()
        self.assertEqual(claimed_id, job.pk)
        self.assertNotEqual(real_token, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
        self.assertEqual(result, 'fenced')
        self.assertEqual(job.status, ContentModerationJob.Status.LEASED)
        # The active lease is not eligible for a second worker to claim.
        self.assertEqual(claim_moderation_jobs(batch_size=1, lease_seconds=60), [])

    @WORKER_SETTINGS
    def test_expired_lease_becomes_outcome_unknown_and_is_not_retried(self):
        _item, job = self.create_job('expired')
        job.status = ContentModerationJob.Status.LEASED
        job.lease_token = 'b9bb0d30-3210-47b8-8944-3814f668bb46'
        job.lease_until = timezone.now() - timedelta(seconds=1)
        job.save(update_fields=('status', 'lease_token', 'lease_until'))
        classifier = Mock(side_effect=AssertionError('ambiguous lease must not retry'))

        count = expire_ambiguous_leases()
        result = run_moderation_batch(classifier=classifier)

        job.refresh_from_db()
        self.assertEqual(count, 1)
        self.assertEqual(job.status, ContentModerationJob.Status.OUTCOME_UNKNOWN)
        self.assertEqual(job.last_error_code, 'lease_expired_outcome_unknown')
        classifier.assert_not_called()
        self.assertEqual(result.counts.get('done', 0), 0)

    @WORKER_SETTINGS
    def test_only_definitive_rate_limit_failure_is_scheduled_with_bounded_retry(self):
        _item, job = self.create_job('retry')
        result = run_moderation_batch(
            base_backoff_seconds=2,
            classifier=lambda *_args, **_kwargs: ModerationClassificationOutcome(
                'unavailable', 'typesafe_rate_limited'
            ),
        )

        job.refresh_from_db()
        self.assertEqual(result.counts['retry'], 1)
        self.assertEqual(job.status, ContentModerationJob.Status.RETRY)
        self.assertGreaterEqual(job.available_at, timezone.now() + timedelta(seconds=1))
        self.assertEqual(job.last_error_code, 'typesafe_rate_limited')

    @WORKER_SETTINGS
    def test_timeout_is_unknown_and_not_retried(self):
        _item, job = self.create_job('timeout')

        result = run_moderation_batch(
            classifier=lambda *_args, **_kwargs: ModerationClassificationOutcome(
                'unavailable', 'typesafe_timeout'
            ),
        )

        job.refresh_from_db()
        self.assertEqual(result.counts['outcome_unknown'], 1)
        self.assertEqual(job.status, ContentModerationJob.Status.OUTCOME_UNKNOWN)
        self.assertEqual(job.last_error_code, 'typesafe_timeout')

    @WORKER_SETTINGS
    def test_retry_exhaustion_fails_without_another_attempt(self):
        _item, job = self.create_job('exhausted')
        job.attempts = 4
        job.save(update_fields=('attempts',))

        result = run_moderation_batch(
            max_attempts=5,
            classifier=lambda *_args, **_kwargs: ModerationClassificationOutcome(
                'unavailable', 'typesafe_config'
            ),
        )

        job.refresh_from_db()
        self.assertEqual(result.counts.get('failed'), 1, result.counts)
        self.assertEqual(job.status, ContentModerationJob.Status.FAILED)
        self.assertEqual(job.attempts, 5)

    @WORKER_SETTINGS
    def test_disabled_worker_does_not_claim_or_call_classifier(self):
        _item, job = self.create_job('disabled')
        classifier = Mock(side_effect=AssertionError('disabled mode must not call Jev'))

        with override_settings(MODERATION_CLASSIFICATION_ENABLED=False):
            result = run_moderation_batch(classifier=classifier)

        job.refresh_from_db()
        classifier.assert_not_called()
        self.assertEqual(result.counts['disabled'], 1)
        self.assertEqual(job.status, ContentModerationJob.Status.QUEUED)
