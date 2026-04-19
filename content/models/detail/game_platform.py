from django.db import models

from .game_detail import GameDetail


class GamePlatform(models.Model):
    """Platform a game runs on (separate from StreamingPlatform: distinct semantics)."""

    game_detail = models.ForeignKey(
        GameDetail,
        on_delete=models.CASCADE,
        related_name='platforms',
    )

    name = models.CharField(max_length=255)
    image_url = models.URLField(max_length=500, blank=True)

    class Meta:
        db_table = 'content_game_platform'
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['game_detail', 'name'],
                name='unique_game_platform_per_game',
            ),
        ]

    def __str__(self):
        return f'GamePlatform({self.name} for {self.game_detail_id})'
