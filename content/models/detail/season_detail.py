from django.db import models

from ..content_item import ContentItem


class SeasonDetail(models.Model):
    content_item = models.OneToOneField(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='season_detail',
    )

    season_number = models.IntegerField(default=0)
    tv_show_name = models.CharField(max_length=500, blank=True)
    title = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    release_date = models.DateField(null=True, blank=True)
    number_of_episodes = models.PositiveIntegerField(default=0)

    last_refreshed_at = models.DateTimeField(auto_now=True, db_index=True)
    source_payload_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        db_table = 'content_season_detail'

    def __str__(self):
        return f'SeasonDetail(content_item={self.content_item_id}, season={self.season_number})'
