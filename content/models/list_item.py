from django.db import models
from django.contrib.auth.models import User
from .user_list import UserList
from .content_item import ContentItem

class ListItem(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'

    user_list = models.ForeignKey(
        UserList,
        on_delete=models.CASCADE,
        related_name='items',
        help_text='List to which this item belongs'
    )

    content_item = models.ForeignKey(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='list_items',
        help_text='Reference to the content'
    )

    added_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='added_items',
        help_text='User who added this item'
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        help_text='Status of the item'
    )

    added_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Date and time of addition'
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Date and time of completion'
    )

    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Personal notes about this item'
    )

    class Meta:
        db_table = 'list_items'
        ordering = ['-added_at']

        # TODO: Ajustar, ahora mismo un contenido puede aparecer varias veces en la misma lista
        indexes = [
            models.Index(fields=['user_list', 'status']),
            models.Index(fields=['content_item']),
            models.Index(fields=['-added_at']),
        ]

    def __str__(self):
        return f"{self.content_item} in {self.user_list.name}"

    def save(self, *args, **kwargs):
        if self.status == self.Status.COMPLETED and not self.completed_at:
            from django.utils import timezone
            self.completed_at = timezone.now()

        elif self.status == self.Status.PENDING:
            self.completed_at = None

        super().save(*args, **kwargs)
