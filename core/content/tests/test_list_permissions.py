from django.contrib.auth.models import User
from django.db import IntegrityError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from content.models import ContentItem, ListInvitation, ListItem, ListMembership, UserList


class ListMembershipModelTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="pw")
        self.member = User.objects.create_user(username="member", password="pw")

    def test_dynamic_lists_do_not_create_collaborative_memberships(self):
        dynamic = UserList.objects.create(
            owner=self.owner,
            name="Completed",
            list_type=UserList.ListType.DYNAMIC,
        )

        self.assertFalse(ListMembership.objects.filter(user_list=dynamic).exists())

    def test_only_one_owner_role_is_allowed(self):
        shared = UserList.objects.create(
            owner=self.owner,
            name="Shared",
            list_type=UserList.ListType.SHARED,
        )
        with self.assertRaises(IntegrityError):
            ListMembership.objects.create(
                user_list=shared,
                user=self.member,
                role=ListMembership.Role.OWNER,
            )


class ListRolePermissionApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="pw")
        self.editor = User.objects.create_user(username="editor", password="pw")
        self.viewer = User.objects.create_user(username="viewer", password="pw")
        self.outsider = User.objects.create_user(username="outsider", password="pw")
        self.shared = UserList.objects.create(
            owner=self.owner,
            name="Shared picks",
            list_type=UserList.ListType.SHARED,
            visibility=UserList.Visibility.PUBLIC,
        )
        ListMembership.objects.create(
            user_list=self.shared,
            user=self.editor,
            role=ListMembership.Role.EDITOR,
        )
        ListMembership.objects.create(
            user_list=self.shared,
            user=self.viewer,
            role=ListMembership.Role.VIEWER,
        )

    def test_viewer_can_read_but_cannot_add_items(self):
        self.client.force_authenticate(self.viewer)
        items_url = reverse(
            "content:lists:items-list",
            kwargs={"list_pk": self.shared.id},
        )

        read_response = self.client.get(items_url)
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)

        write_response = self.client.post(
            items_url,
            {
                "source_api": "tmdb",
                "external_id": "viewer-write",
                "content_type": ContentItem.ContentType.MOVIE,
            },
            format="json",
        )
        self.assertEqual(write_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_editor_can_add_and_owner_can_change_role(self):
        self.client.force_authenticate(self.editor)
        items_url = reverse(
            "content:lists:items-list",
            kwargs={"list_pk": self.shared.id},
        )
        response = self.client.post(
            items_url,
            {
                "source_api": "tmdb",
                "external_id": "editor-write",
                "content_type": ContentItem.ContentType.MOVIE,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(self.owner)
        role_url = reverse(
            "content:lists:members-detail",
            kwargs={"list_pk": self.shared.id, "pk": self.editor.id},
        )
        role_response = self.client.patch(
            role_url,
            {"role": "viewer"},
            format="json",
        )
        self.assertEqual(role_response.status_code, status.HTTP_200_OK)
        self.assertEqual(role_response.data["role"], "viewer")

    def test_member_cannot_escalate_self_or_remove_owner(self):
        self.client.force_authenticate(self.editor)
        role_url = reverse(
            "content:lists:members-detail",
            kwargs={"list_pk": self.shared.id, "pk": self.editor.id},
        )
        role_response = self.client.patch(
            role_url,
            {"role": "owner"},
            format="json",
        )
        self.assertEqual(role_response.status_code, status.HTTP_403_FORBIDDEN)

        owner_url = reverse(
            "content:lists:members-detail",
            kwargs={"list_pk": self.shared.id, "pk": self.owner.id},
        )
        remove_response = self.client.delete(owner_url)
        self.assertEqual(remove_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(
            ListMembership.objects.filter(
                user_list=self.shared,
                user=self.owner,
                role=ListMembership.Role.OWNER,
            ).exists()
        )

    def test_editor_cannot_manage_settings_or_send_invitations(self):
        self.client.force_authenticate(self.editor)

        settings_response = self.client.patch(
            reverse("content:lists:list-detail", kwargs={"pk": self.shared.id}),
            {"name": "Editor rename"},
            format="json",
        )
        self.assertEqual(settings_response.status_code, status.HTTP_403_FORBIDDEN)

        invitation_response = self.client.post(
            reverse(
                "content:lists:invitations-list",
                kwargs={"list_pk": self.shared.id},
            ),
            {"username": self.outsider.username},
            format="json",
        )
        self.assertEqual(invitation_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_public_list_payload_has_no_email_or_invitation_metadata(self):
        self.client.force_authenticate(None)
        response = self.client.get(
            reverse("content:lists:list-detail", kwargs={"pk": self.shared.id})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("email", response.data["owner"])
        self.assertNotIn("invitations", response.data)
        self.assertNotIn("email", str(response.data))

    def test_invitation_persists_and_grants_requested_role(self):
        self.client.force_authenticate(self.owner)
        invitation_url = reverse(
            "content:lists:invitations-list",
            kwargs={"list_pk": self.shared.id},
        )
        response = self.client.post(
            invitation_url,
            {"username": self.outsider.username, "role": "viewer"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invitation = ListInvitation.objects.get(user_list=self.shared)
        self.assertEqual(invitation.role, ListMembership.Role.VIEWER)

        self.client.force_authenticate(self.outsider)
        respond_url = reverse(
            "content:invitations:detail",
            kwargs={"pk": invitation.id},
        ) + "respond/"
        accepted = self.client.post(respond_url, {"action": "accept"}, format="json")
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        self.assertEqual(
            ListMembership.objects.get(
                user_list=self.shared,
                user=self.outsider,
            ).role,
            ListMembership.Role.VIEWER,
        )
