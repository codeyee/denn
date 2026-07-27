from django.conf import settings
from django.core.validators import URLValidator
from django.db import models


class UserPreferences(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="preferences",
    )
    allow_adult_content = models.BooleanField(default=False)
    dynamic_collections_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "user preferences"


class UserPublicProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="public_profile",
    )
    bio = models.CharField(max_length=280, blank=True)
    avatar_url = models.URLField(
        max_length=2048,
        blank=True,
        validators=[URLValidator(schemes=["https"])],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_public_profiles"

    def __str__(self):
        return f"Public profile for {self.user.username}"
