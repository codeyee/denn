from django.db import models

from .season_detail import SeasonDetail


class Episode(models.Model):
    season_detail = models.ForeignKey(
        SeasonDetail,
        on_delete=models.CASCADE,
        related_name='episodes',
    )

    episode_id_external = models.CharField(max_length=128)
    episode_number = models.IntegerField()
    season_number = models.IntegerField()
    title = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    release_date = models.DateField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    episode_type = models.CharField(max_length=64, blank=True)

    class Meta:
        db_table = 'content_episode'
        ordering = ['episode_number']
        constraints = [
            models.UniqueConstraint(
                fields=['season_detail', 'episode_id_external'],
                name='unique_episode_per_season',
            ),
        ]
        indexes = [
            models.Index(fields=['season_detail', 'episode_number']),
        ]

    def __str__(self):
        return f'Episode(season={self.season_detail_id}, n={self.episode_number})'
