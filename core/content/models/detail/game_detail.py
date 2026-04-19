from django.db import models

from ..content_item import ContentItem


class GameDetail(models.Model):
    content_item = models.OneToOneField(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='game_detail',
    )

    title = models.CharField(max_length=500, blank=True)
    game_type = models.CharField(max_length=64, blank=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    release_date = models.DateField(null=True, blank=True)
    series = models.CharField(max_length=500, blank=True)
    play_time_min = models.PositiveIntegerField(null=True, blank=True)
    play_time_max = models.PositiveIntegerField(null=True, blank=True)

    genres = models.ManyToManyField('content.Genre', blank=True, related_name='games')
    themes = models.ManyToManyField('content.Theme', blank=True, related_name='games')
    game_modes = models.ManyToManyField('content.GameMode', blank=True, related_name='games')

    last_refreshed_at = models.DateTimeField(auto_now=True, db_index=True)
    source_payload_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        db_table = 'content_game_detail'

    def __str__(self):
        return f'GameDetail(content_item={self.content_item_id})'
