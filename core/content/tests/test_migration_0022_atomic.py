"""Regression coverage for the 0022 membership-roles migration fix."""
import importlib

from django.apps import apps
from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase

from content.models import ListMembership, UserList

migration_0022 = importlib.import_module(
    "content.migrations.0022_list_membership_roles")


class Migration0022AtomicTests(TestCase):
    def test_migration_is_non_atomic(self):
        # RunPython data writes must commit before CREATE INDEX, or
        # PostgreSQL fails on populated snapshots with pending triggers.
        self.assertIs(migration_0022.Migration.atomic, False)

    def test_seed_owner_memberships_repairs_roles(self):
        # Exercises the seed logic against current model state.
        owner = get_user_model().objects.create_user(username='seed-owner')
        editor = get_user_model().objects.create_user(username='seed-editor')
        user_list = UserList.objects.create(name='Seed list', owner=owner)
        # Simulate the legacy state: the auto-created owner row lost OWNER
        # while a non-owner wrongly holds it.
        ListMembership.objects.filter(user_list=user_list,
                                      user=owner).update(role=ListMembership.Role.EDITOR)
        ListMembership.objects.create(user_list=user_list, user=editor,
                                      role=ListMembership.Role.OWNER)
        migration_0022.seed_owner_memberships(apps, connection.schema_editor())
        memberships = {m.user_id: m.role
                       for m in ListMembership.objects.filter(user_list=user_list)}
        self.assertEqual(memberships[owner.id], ListMembership.Role.OWNER)
        self.assertEqual(memberships[editor.id], ListMembership.Role.EDITOR)
