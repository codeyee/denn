from django.db import models
from django.contrib.auth.models import User
from .user_list import UserList
from .content_item import ContentItem
from django.db.models import Max

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

    context_status = models.CharField(
        max_length=10,
        choices=Status.choices,
        null=True,
        blank=True,
        default=None,
        help_text='Shared-list context; personal progress lives in tracking'
    )

    added_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Date and time of addition'
    )

    context_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Date and time of contextual shared-list completion'
    )

    list_order = models.IntegerField(
        default=0,
        help_text='Order position within the list (1-based)'
    )

    class Meta:
        db_table = 'list_items'
        ordering = ['list_order', '-added_at']

        indexes = [
            models.Index(
                fields=['user_list', 'context_status'],
                name='list_items_context_4aac12_idx',
            ),
            models.Index(fields=['content_item']),
            models.Index(fields=['-added_at']),
            models.Index(fields=['user_list', 'list_order']),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=['user_list', 'list_order'],
                name='unique_list_order_per_list',
            ),
            models.UniqueConstraint(
                fields=['user_list', 'content_item'],
                name='unique_item_per_list',
            ),
        ]

    def __str__(self):
        return f"{self.content_item} in {self.user_list.name}"

    def save(self, *args, **kwargs):
        if (
            self.context_status == self.Status.COMPLETED
            and not self.context_completed_at
        ):
            from django.utils import timezone
            self.context_completed_at = timezone.now()

        elif self.context_status != self.Status.COMPLETED:
            self.context_completed_at = None

        if (self.list_order or 0) <= 0 and self.user_list_id:
            max_position = (
                ListItem.objects.filter(user_list_id=self.user_list_id)
                .aggregate(max_pos=Max('list_order'))
                .get('max_pos') or 0
            )
            self.list_order = max_position + 1

        super().save(*args, **kwargs)
