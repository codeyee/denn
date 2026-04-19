from django.db import models

from ..content_item import ContentItem


class StreamingPlatform(models.Model):
    """Watch-availability row for movies/tv/season ContentItems.

    The proxy returns `platforms` as `map[kind][]Platform` keyed by
    "stream"/"rent"/"buy". We flatten that into one row per (kind, name),
    storing the country we resolved the data for so concurrent multi-country
    refreshes don't clobber each other for the same content.
    """

    class Kind(models.TextChoices):
        STREAM = 'stream', 'Stream'
        RENT = 'rent', 'Rent'
        BUY = 'buy', 'Buy'

    content_item = models.ForeignKey(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='streaming_platforms',
    )

    kind = models.CharField(max_length=16, choices=Kind.choices)
    name = models.CharField(max_length=255)
    image_url = models.URLField(max_length=500, blank=True)
    country_code = models.CharField(max_length=8, blank=True)

    class Meta:
        db_table = 'content_streaming_platform'
        constraints = [
            models.UniqueConstraint(
                fields=['content_item', 'kind', 'name', 'country_code'],
                name='unique_streaming_platform_per_item',
            ),
        ]
        indexes = [
            models.Index(fields=['content_item', 'kind']),
            models.Index(fields=['content_item', 'country_code']),
        ]

    def __str__(self):
        return f'StreamingPlatform({self.kind}:{self.name} for {self.content_item_id})'
