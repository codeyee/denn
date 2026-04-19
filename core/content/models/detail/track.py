from django.db import models

from .album_detail import AlbumDetail


class Track(models.Model):
    album_detail = models.ForeignKey(
        AlbumDetail,
        on_delete=models.CASCADE,
        related_name='tracks',
    )

    track_id_external = models.CharField(max_length=128)
    track_number = models.IntegerField()
    title = models.CharField(max_length=500, blank=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    external_url = models.URLField(max_length=500, blank=True)

    class Meta:
        db_table = 'content_track'
        ordering = ['track_number']
        constraints = [
            models.UniqueConstraint(
                fields=['album_detail', 'track_id_external'],
                name='unique_track_per_album',
            ),
        ]
        indexes = [
            models.Index(fields=['album_detail', 'track_number']),
        ]

    def __str__(self):
        return f'Track(album={self.album_detail_id}, n={self.track_number})'
