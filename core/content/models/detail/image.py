from django.db import models

from ..content_item import ContentItem


class Image(models.Model):
    """Polymorphic image attached to any ContentItem.

    `type` mirrors the proxy's `ImageType` ("poster", "gallery", ...) and
    `size` mirrors `ImageSize` ("standard", "original", ...). `position`
    is derived from the index of the proxy's `images` array at ingest, so
    the reconstructor can re-emit the list in the same order.
    """

    class Type(models.TextChoices):
        POSTER = 'poster', 'Poster'
        GALLERY = 'gallery', 'Gallery'

    class Size(models.TextChoices):
        STANDARD = 'standard', 'Standard'
        ORIGINAL = 'original', 'Original'

    content_item = models.ForeignKey(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='images',
    )

    type = models.CharField(max_length=32, choices=Type.choices, default=Type.POSTER)
    size = models.CharField(max_length=32, choices=Size.choices, default=Size.STANDARD)
    image_url = models.URLField(max_length=500)
    position = models.SmallIntegerField(default=0)

    class Meta:
        db_table = 'content_image'
        ordering = ['position', 'id']
        indexes = [
            models.Index(fields=['content_item', 'type']),
            models.Index(fields=['content_item', 'position']),
        ]

    def __str__(self):
        return f'Image(content_item={self.content_item_id}, type={self.type})'
