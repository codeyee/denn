"""Persisted Jev moderation judgments for content items.

`ContentModerationJudgment` stores one versioned judgment per
(content item, normalized-input hash, resolved model, question revision).
Policy revisions are intentionally excluded from that identity so a policy
change can be re-evaluated in code without paying for new inference.
"""
from django.db import models

from content.settings_defaults import current_policy_revision

from .content_item import ContentItem


class ContentModerationJudgment(models.Model):
    """A single versioned moderation judgment for one content item.

    The `payload` field preserves the raw typed response (per-question nouls,
    probabilities, usage) so thresholds can be replayed later without storing
    full provider payloads.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETE = 'complete', 'Complete'
        ERROR = 'error', 'Error'
        STALE = 'stale', 'Stale'

    class Classification(models.TextChoices):
        SAFE = 'safe_for_automatic_discovery', 'Safe for automatic discovery'
        EXPLICIT = 'explicit_or_sensitive', 'Explicit or sensitive'
        NEEDS_REVIEW = 'needs_review', 'Needs review'
        UNKNOWN = 'unknown', 'Unknown'

    content_item = models.ForeignKey(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='moderation_judgments',
    )
    source_data_hash = models.CharField(
        max_length=64,
        help_text='Hash of the normalized text inputs used for this judgment',
    )
    model_name = models.CharField(
        max_length=64,
        help_text='Exact resolved model version that produced this judgment (e.g. jev-1.13.0)',
    )
    question_revision = models.CharField(
        max_length=32,
        help_text='Semantic revision of the Jev questions and criteria',
    )
    policy_revision = models.CharField(
        max_length=32,
        default=current_policy_revision,
        help_text='Semantic revision of the code-owned mapping applied to the raw answers',
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    classification = models.CharField(
        max_length=32,
        choices=Classification.choices,
        default=Classification.UNKNOWN,
    )
    payload = models.JSONField(
        default=dict,
        blank=True,
        help_text='Raw typed response data (nouls, probabilities, usage); no provider payloads',
    )
    error_code = models.CharField(
        max_length=64,
        blank=True,
        help_text='Machine-readable failure code, e.g. typesafe_timeout',
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'content_moderation_judgment'
        verbose_name = 'content moderation judgment'
        verbose_name_plural = 'content moderation judgments'
        constraints = [
            models.UniqueConstraint(
                fields=['content_item', 'source_data_hash', 'model_name', 'question_revision'],
                name='unique_moderation_judgment_identity',
            ),
        ]
        indexes = [
            models.Index(
                fields=['content_item', 'status'],
                name='moderation_item_status_idx',
            ),
            models.Index(
                fields=['status', 'classification'],
                name='moderation_status_class_idx',
            ),
        ]

    def __str__(self):
        return (
            f'ModerationJudgment({self.content_item_id}:{self.model_name}:'
            f'{self.question_revision}:{self.status})'
        )


class ContentModerationJob(models.Model):
    """Durable request-path outbox for asynchronous moderation work.

    A job identifies the requested model alias, not a resolved model version.
    A worker must still re-check source freshness around any remote call; this
    row cannot provide exactly-once delivery across an ambiguous timeout.
    """

    class Status(models.TextChoices):
        QUEUED = 'queued', 'Queued'
        LEASED = 'leased', 'Leased'
        RETRY = 'retry', 'Retry'
        DONE = 'done', 'Done'
        SUPERSEDED = 'superseded', 'Superseded'
        FAILED = 'failed', 'Failed'
        OUTCOME_UNKNOWN = 'outcome_unknown', 'Outcome unknown'

    content_item = models.ForeignKey(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='moderation_jobs',
    )
    source_data_hash = models.CharField(max_length=64)
    requested_model = models.CharField(max_length=64)
    question_revision = models.CharField(max_length=32)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.QUEUED,
    )
    attempts = models.PositiveIntegerField(default=0)
    available_at = models.DateTimeField()
    lease_token = models.UUIDField(null=True, blank=True)
    lease_until = models.DateTimeField(null=True, blank=True)
    last_error_code = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'content_moderation_job'
        constraints = [
            models.UniqueConstraint(
                fields=[
                    'content_item',
                    'source_data_hash',
                    'requested_model',
                    'question_revision',
                ],
                name='unique_moderation_job_identity',
            ),
        ]
        indexes = [
            models.Index(
                fields=['status', 'available_at', 'id'],
                name='moderation_job_ready_idx',
            ),
            models.Index(
                fields=['content_item', 'status'],
                name='moderation_job_item_status_idx',
            ),
        ]

    def __str__(self):
        return (
            f'ModerationJob({self.content_item_id}:{self.requested_model}:'
            f'{self.question_revision}:{self.status})'
        )
