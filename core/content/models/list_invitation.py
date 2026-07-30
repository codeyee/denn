from django.db import models
from django.contrib.auth.models import User
from .user_list import UserList
from .list_membership import ListMembership

class ListInvitation(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REJECTED = 'REJECTED', 'Rejected'

    user_list = models.ForeignKey(
        UserList,
        on_delete=models.CASCADE,
        related_name='invitations',
        help_text='List to which the user is invited'
    )

    inviter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_invitations',
        help_text='User who sent the invitation'
    )

    invitee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='received_invitations',
        help_text='User who received the invitation'
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        help_text='Invitation status'
    )

    role = models.CharField(
        max_length=10,
        choices=[
            (ListMembership.Role.EDITOR, 'Editor'),
            (ListMembership.Role.VIEWER, 'Viewer'),
        ],
        default=ListMembership.Role.EDITOR,
        help_text='Role granted when the invitation is accepted',
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Date and time of invitation'
    )

    responded_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Date and time of response (accepted/rejected)'
    )

    class Meta:
        db_table = 'list_invitations'
        ordering = ['-created_at']

        constraints = [
            models.UniqueConstraint(
                fields=['user_list', 'invitee'],
                name='unique_list_invitation'
            )
        ]

        indexes = [
            models.Index(fields=['invitee', 'status']),
            models.Index(fields=['user_list', 'status']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.inviter.username} invited {self.invitee.username} to {self.user_list.name} ({self.status})"
