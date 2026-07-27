from django.conf import settings
from django.db import models


class DynamicCollectionPreference(models.Model):
    class CollectionKey(models.TextChoices):
        BACKLOG = "backlog", "Backlog"
        IN_PROGRESS = "in-progress", "In progress"
        ON_HOLD = "on-hold", "On hold"
        DROPPED = "dropped", "Dropped"
        COMPLETED = "completed", "Completed"
        MOVIES = "movies", "Movies"
        SERIES = "series", "Series"
        GAMES = "games", "Games"
        ALBUMS = "albums", "Albums"
        BOOKS = "books", "Books"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dynamic_collection_preferences",
    )
    collection_key = models.CharField(
        max_length=32,
        choices=CollectionKey.choices,
    )
    enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "dynamic_collection_preferences"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "collection_key"],
                name="unique_user_dynamic_collection_preference",
            )
        ]

    def __str__(self):
        return f"{self.user_id}:{self.collection_key} ({self.enabled})"
