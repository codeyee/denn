from django.db import models

from ..content_item import ContentItem
from .author import Author


class ContentItemAuthor(models.Model):
    """Through-table linking a ContentItem to an Author with a `role`.

    `role` mirrors the `Author.Type` value emitted by the proxy
    (e.g. "artist", "producer", "developer", "author").
    """

    content_item = models.ForeignKey(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='content_authors',
    )
    author = models.ForeignKey(
        Author,
        on_delete=models.CASCADE,
        related_name='content_authors',
    )
    role = models.CharField(max_length=64)
    position = models.SmallIntegerField(default=0)

    class Meta:
        db_table = 'content_item_author'
        ordering = ['position', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['content_item', 'author', 'role'],
                name='unique_content_item_author_role',
            ),
        ]
        indexes = [
            models.Index(fields=['content_item', 'role']),
        ]

    def __str__(self):
        return f'{self.author.name} ({self.role}) on {self.content_item_id}'
