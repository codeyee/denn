"""
Browse metadata for content items (Sprint 4.5B).

Aux table 1:1 with `ContentItem` that materializes the cross-content fields
needed to filter/sort/group lists in SQL without having to parse the
external `source_data` JSON. Fields are populated by
`content.services.browse_metadata_service` from the proxy payloads.

Includes a stub for the future "rehydration" system: when
`last_refreshed_at` is older than a TTL, a follow-up sprint will refresh
the row from the upstream API. For now we only persist enough metadata
to make the decision later.
"""
from django.db import models

from .content_item import ContentItem


class ContentItemBrowseMetadata(models.Model):
    content_item = models.OneToOneField(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='browse_meta',
        help_text='Content item this browse metadata belongs to',
    )

    # Cross-content
    display_title = models.CharField(
        max_length=500,
        blank=True,
        db_index=True,
        help_text='Primary title used for display and sorting',
    )

    # Album / music
    artist = models.CharField(
        max_length=500,
        blank=True,
        db_index=True,
        help_text='Primary artist name (ALBUM)',
    )
    album_title = models.CharField(
        max_length=500,
        blank=True,
        help_text='Album title (ALBUM)',
    )

    # Generic release date used by ALBUM (release_date), MOVIE (release_date),
    # TV_SHOW (first_air_date), GAME (first_release_date) and BOOK (first_publish_date).
    release_date = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        help_text='Primary release/publish date in canonical form',
    )

    # Rehydration stub (follow-up sprint owns the actual job).
    last_refreshed_at = models.DateTimeField(
        auto_now=True,
        db_index=True,
        help_text='When this metadata was last refreshed from the upstream API',
    )
    source_payload_hash = models.CharField(
        max_length=64,
        blank=True,
        help_text='Hash of the upstream payload used to detect changes during rehydration',
    )

    class Meta:
        db_table = 'content_item_browse_metadata'
        verbose_name = 'Content item browse metadata'
        verbose_name_plural = 'Content item browse metadata'

    def __str__(self):
        return f'BrowseMeta(content_item={self.content_item_id}, title={self.display_title!r})'
