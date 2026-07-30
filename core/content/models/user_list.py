from django.db import models
from django.contrib.auth.models import User

class UserList(models.Model):
    class ListType(models.TextChoices):
        PERSONAL = 'PERSONAL', 'Personal'
        SHARED = 'SHARED', 'Shared'
        DYNAMIC = 'DYNAMIC', 'Dynamic'

    class Visibility(models.TextChoices):
        PUBLIC = 'PUBLIC', 'Public'
        PRIVATE = 'PRIVATE', 'Private'

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

    dynamic_key = models.CharField(
        max_length=32,
        blank=True,
        null=True,
        help_text='System-managed key for a dynamically populated list',
    )

    visibility = models.CharField(
        max_length=10,
        choices=Visibility.choices,
        default=Visibility.PRIVATE,
        db_index=True,
        help_text='Whether the list is publicly readable'
    )

    members = models.ManyToManyField(
        User,
        through='ListMembership',
        related_name='member_lists',
        blank=True,
        help_text='Members of the list (roles are stored in ListMembership)'
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
            models.Index(
                fields=['owner', 'dynamic_key'],
                name='userlist_owner_dyn_key_idx',
            ),
            models.Index(fields=['owner', 'visibility']),
            models.Index(fields=['-created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['owner', 'dynamic_key'],
                name='unique_dynamic_list_key_per_owner',
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.owner.username})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        from .list_membership import ListMembership

        if self.list_type != self.ListType.DYNAMIC:
            # The owner is a real membership for both personal and shared
            # lists. Demote stale owner rows first so an ownership repair is
            # safe even when legacy data is anomalous.
            ListMembership.objects.filter(
                user_list_id=self.pk,
                role=ListMembership.Role.OWNER,
            ).exclude(user_id=self.owner_id).update(
                role=ListMembership.Role.EDITOR,
            )
            ListMembership.objects.update_or_create(
                user_list_id=self.pk,
                user_id=self.owner_id,
                defaults={'role': ListMembership.Role.OWNER},
            )
        else:
            # Dynamic collections are system-owned projections, never a
            # collaborative membership surface.
            ListMembership.objects.filter(user_list_id=self.pk).delete()
