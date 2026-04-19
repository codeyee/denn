from django.db import models
from django.utils.text import slugify


class GameMode(models.Model):
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, unique=True)

    class Meta:
        db_table = 'content_game_mode'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            self.slug = slugify(self.name)[:255] or self.name[:255]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
