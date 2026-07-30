from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q


class ListMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = "OWNER", "Owner"
        EDITOR = "EDITOR", "Editor"
        VIEWER = "VIEWER", "Viewer"

    user_list = models.ForeignKey(
        "content.UserList",
        on_delete=models.CASCADE,
        related_name="memberships",
        # Keep the physical column created by the legacy implicit M2M table.
        db_column="userlist_id",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="list_memberships",
    )
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.EDITOR,
    )

    class Meta:
        db_table = "user_lists_members"
        constraints = [
            models.UniqueConstraint(
                fields=["user_list", "user"],
                name="unique_list_membership",
            ),
            models.UniqueConstraint(
                fields=["user_list"],
                condition=Q(role="OWNER"),
                name="unique_list_owner_membership",
            ),
            models.CheckConstraint(
                condition=Q(role__in=["OWNER", "EDITOR", "VIEWER"]),
                name="valid_list_membership_role",
            ),
        ]

    def __str__(self):
        return f"{self.user.username} in {self.user_list.name} ({self.role})"
