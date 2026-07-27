from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q

from .content_item import ContentItem


class UserContentTracking(models.Model):
    class Status(models.TextChoices):
        BACKLOG = "backlog", "Backlog"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        ON_HOLD = "on_hold", "On hold"
        DROPPED = "dropped", "Dropped"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="content_tracking",
    )
    content_item = models.ForeignKey(
        ContentItem,
        on_delete=models.CASCADE,
        related_name="user_tracking",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.BACKLOG,
    )
    last_completed_at = models.DateTimeField(null=True, blank=True)
    is_favorite = models.BooleanField(default=False)
    favorited_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_content_tracking"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "content_item"],
                name="unique_user_content_tracking",
            ),
            models.CheckConstraint(
                condition=(
                    Q(is_favorite=True, favorited_at__isnull=False)
                    | Q(is_favorite=False, favorited_at__isnull=True)
                ),
                name="tracking_favorite_date_consistent",
            ),
            models.CheckConstraint(
                condition=Q(is_favorite=False) | Q(status="completed"),
                name="tracking_favorite_requires_completed",
            ),
        ]
        indexes = [
            models.Index(
                fields=["user", "status", "-last_completed_at"],
                name="tracking_user_status_idx",
            ),
            models.Index(
                fields=["user", "is_favorite"],
                name="tracking_user_favorite_idx",
            ),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.content_item_id} ({self.status})"
