from django.db import models

from ..content_item import ContentItem


class GameDurationEstimate(models.Model):
    class Provider(models.TextChoices):
        IGDB = 'igdb', 'IGDB'

    class Status(models.TextChoices):
        MATCHED = 'matched', 'Matched'
        NO_DATA = 'no_data', 'No data'
        STALE = 'stale', 'Stale'
        ERROR = 'error', 'Error'

    content_item = models.ForeignKey(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='game_duration_estimates',
    )
    provider = models.CharField(max_length=32, choices=Provider.choices)
    provider_external_id = models.CharField(max_length=255)
    hastily_seconds = models.PositiveIntegerField(null=True, blank=True)
    normally_seconds = models.PositiveIntegerField(null=True, blank=True)
    completely_seconds = models.PositiveIntegerField(null=True, blank=True)
    synced_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NO_DATA)
    sample_count = models.PositiveIntegerField(default=0)
    retry_count = models.PositiveIntegerField(default=0)
    last_error_code = models.CharField(max_length=64, blank=True)
    payload_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        db_table = 'content_game_duration_estimate'
        constraints = [
            models.UniqueConstraint(
                fields=['content_item', 'provider'],
                name='unique_game_duration_provider',
            ),
        ]
        indexes = [
            models.Index(fields=['provider', 'status'], name='game_dur_provider_status_idx'),
        ]

    def __str__(self):
        return f'GameDurationEstimate({self.content_item_id}:{self.provider})'
