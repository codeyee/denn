from django.db import models

from ..content_item import ContentItem


class MovieDetail(models.Model):
    """Per-type detail row for a movie ContentItem.

    1:1 with ContentItem. Populated from the proxy's normalized payload by
    `local_content_store.mappers.movie.upsert`. Reconstruction back to that
    payload happens in `payload_reconstructor.movie.from_local`.
    """

    content_item = models.OneToOneField(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='movie_detail',
    )

    title = models.CharField(max_length=500, blank=True)
    original_title = models.CharField(max_length=500, blank=True)
    tagline = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    release_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=64, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    imdb_id = models.CharField(max_length=64, blank=True)

    last_refreshed_at = models.DateTimeField(auto_now=True, db_index=True)
    source_payload_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        db_table = 'content_movie_detail'

    def __str__(self):
        return f'MovieDetail(content_item={self.content_item_id})'
