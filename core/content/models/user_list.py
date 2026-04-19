from django.db import models
from django.contrib.auth.models import User

class UserList(models.Model):
    class ListType(models.TextChoices):
        PERSONAL = 'PERSONAL', 'Personal'
        SHARED = 'SHARED', 'Shared'

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_lists',
        help_text='Creator and owner of the list'
    )

    name = models.CharField(
        max_length=255,
        help_text='Name of the list'
    )

    description = models.TextField(
        blank=True,
        null=True,
        help_text='Optional description of the list'
    )

    list_type = models.CharField(
        max_length=10,
        choices=ListType.choices,
        default=ListType.PERSONAL,
        help_text='List type'
    )

    members = models.ManyToManyField(
        User,
        related_name='member_lists',
        blank=True,
        help_text='Members of the list (for shared lists)'
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
        db_table = 'user_lists'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'list_type']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.name} ({self.owner.username})"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        is_shared = self.list_type == self.ListType.SHARED
        super().save(*args, **kwargs)

        if is_new and is_shared:
            self.members.add(self.owner)

