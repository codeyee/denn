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
