from django.db import models

from ..content_item import ContentItem


class AlbumDetail(models.Model):
    content_item = models.OneToOneField(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='album_detail',
    )

    title = models.CharField(max_length=500, blank=True)
    album_type = models.CharField(max_length=64, blank=True)
    total_tracks = models.PositiveIntegerField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    release_date = models.DateField(null=True, blank=True)
    external_url = models.URLField(max_length=500, blank=True)

    last_refreshed_at = models.DateTimeField(auto_now=True, db_index=True)
    source_payload_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        db_table = 'content_album_detail'

    def __str__(self):
        return f'AlbumDetail(content_item={self.content_item_id})'
