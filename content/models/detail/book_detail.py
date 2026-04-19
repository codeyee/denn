from django.db import models

from ..content_item import ContentItem


class BookDetail(models.Model):
    content_item = models.OneToOneField(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='book_detail',
    )

    title = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    pages = models.PositiveIntegerField(null=True, blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    release_date = models.DateField(null=True, blank=True)

    last_refreshed_at = models.DateTimeField(auto_now=True, db_index=True)
    source_payload_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        db_table = 'content_book_detail'

    def __str__(self):
        return f'BookDetail(content_item={self.content_item_id})'
