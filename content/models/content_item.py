from django.db import models

class ContentItem(models.Model):
    class SourceAPI(models.TextChoices):
        TMDB = 'tmdb', 'TMDB'
        IGDB = 'igdb', 'IGDB'
        SPOTIFY = 'spotify', 'Spotify'
        OPENLIBRARY = 'openlibrary', 'OpenLibrary'

    class ContentType(models.TextChoices):
        MOVIE = 'MOVIE', 'Movie'
        TV_SHOW = 'TV_SHOW', 'TV Show'
        GAME = 'GAME', 'Game'
        ALBUM = 'ALBUM', 'Album'
        BOOK = 'BOOK', 'Book'

    source_api = models.CharField(
        max_length=20,
        choices=SourceAPI.choices,
        help_text='External API source'
    )

    external_id = models.CharField(
        max_length=255,
        help_text='Unique ID of the item in the external API'
    )

    content_type = models.CharField(
        max_length=20,
        choices=ContentType.choices,
        help_text='Content type'
    )

    rating_count = models.IntegerField(
        default=0,
        help_text='Total number of ratings (cached)'
    )

    average_rating = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Average rating score (cached)'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'content_items'

        constraints = [
            models.UniqueConstraint(
                fields=['source_api', 'external_id', 'content_type'],
                name='unique_external_content'
            )
        ]

        indexes = [
            models.Index(fields=['source_api', 'external_id']),
            models.Index(fields=['content_type']),
        ]

    def __str__(self):
        return f"{self.content_type} - {self.source_api}:{self.external_id}"

