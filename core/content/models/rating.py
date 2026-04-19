from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from .content_item import ContentItem

class Rating(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='ratings',
        help_text='User who performs the rating'
    )

    content_item = models.ForeignKey(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='ratings',
        help_text='Content being rated'
    )

    score = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        validators=[
            MinValueValidator(0.5),
            MaxValueValidator(10.0)
        ],
        help_text='Rating from 0.5 to 10.0 (in increments of 0.5)'
    )

    comment = models.TextField(
        blank=True,
        null=True,
        help_text='Optional comment'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Date and time of creation'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='Date and time of last update'
    )

    class Meta:
        db_table = 'ratings'
        ordering = ['-created_at']

        constraints = [
            models.UniqueConstraint(
                fields=['user', 'content_item'],
                name='unique_user_rating'
            )
        ]

        indexes = [
            models.Index(fields=['content_item', '-created_at']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.content_item} ({self.score})"
