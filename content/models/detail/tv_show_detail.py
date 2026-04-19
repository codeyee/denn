from django.db import models

from ..content_item import ContentItem


class TvShowDetail(models.Model):
    content_item = models.OneToOneField(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='tv_show_detail',
    )

    title = models.CharField(max_length=500, blank=True)
    original_title = models.CharField(max_length=500, blank=True)
    tagline = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    release_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=64, blank=True)
    number_of_seasons = models.PositiveIntegerField(null=True, blank=True)
    number_of_episodes = models.PositiveIntegerField(null=True, blank=True)
    imdb_id = models.CharField(max_length=64, blank=True)

    last_refreshed_at = models.DateTimeField(auto_now=True, db_index=True)
    source_payload_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        db_table = 'content_tv_show_detail'

    def __str__(self):
        return f'TvShowDetail(content_item={self.content_item_id})'
