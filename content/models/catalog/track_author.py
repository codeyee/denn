from django.db import models

from ..detail.track import Track
from .author import Author


class TrackAuthor(models.Model):
    """Through-table linking a Track to an Author with a `role`.

    Track-level credits can differ from album-level credits (featured
    artists on a single track, etc.).
    """

    track = models.ForeignKey(
        Track,
        on_delete=models.CASCADE,
        related_name='track_authors',
    )
    author = models.ForeignKey(
        Author,
        on_delete=models.CASCADE,
        related_name='track_authors',
    )
    role = models.CharField(max_length=64)
    position = models.SmallIntegerField(default=0)

    class Meta:
        db_table = 'content_track_author'
        ordering = ['position', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['track', 'author', 'role'],
                name='unique_track_author_role',
            ),
        ]

    def __str__(self):
        return f'{self.author.name} ({self.role}) on track {self.track_id}'
