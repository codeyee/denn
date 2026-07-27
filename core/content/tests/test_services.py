from django.test import TestCase
from django.contrib.auth.models import User
from decimal import Decimal

from content.models import ContentItem, UserList, ListItem, Rating
from content.services.list_service import get_list_stats, ensure_owner_membership, remove_member
from content.services.bulk_check_service import check_items_in_lists, ensure_content_items


class ListServiceTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username='owner', password='pw')
        self.member = User.objects.create_user(username='member', password='pw')
        self.shared = UserList.objects.create(name='Shared', owner=self.user, list_type='SHARED')
        self.shared.members.add(self.user, self.member)

        self.ci = ContentItem.objects.create(source_api='tmdb', external_id='1', content_type='MOVIE')
        ListItem.objects.create(
            user_list=self.shared,
            content_item=self.ci,
            added_by=self.user,
            context_status='COMPLETED',
        )

    def test_get_list_stats_returns_correct_counts(self):
        stats = get_list_stats(self.shared)
        self.assertEqual(stats['total_items'], 1)
        self.assertEqual(stats['completed_items'], 1)
        self.assertEqual(stats['pending_items'], 0)
        self.assertEqual(stats['content_types'], {'MOVIE': 1})

    def test_ensure_owner_membership_adds_owner_if_missing(self):
        new_list = UserList.objects.create(name='X', owner=self.user, list_type='SHARED')
        # Model.save() already adds owner for SHARED, so remove to test the service
        new_list.members.remove(self.user)
        self.assertFalse(new_list.members.filter(pk=self.user.pk).exists())
        ensure_owner_membership(new_list)
        self.assertTrue(new_list.members.filter(pk=self.user.pk).exists())

    def test_ensure_owner_membership_noop_for_personal(self):
        personal = UserList.objects.create(name='P', owner=self.user, list_type='PERSONAL')
        ensure_owner_membership(personal)
        self.assertEqual(personal.members.count(), 0)

    def test_remove_member_success(self):
        ok, err, _ = remove_member(self.shared, self.member)
        self.assertTrue(ok)
        self.assertFalse(self.shared.members.filter(pk=self.member.pk).exists())

    def test_remove_member_cannot_remove_owner(self):
        ok, err, _ = remove_member(self.shared, self.user)
        self.assertFalse(ok)

    def test_remove_member_not_shared(self):
        personal = UserList.objects.create(name='P', owner=self.user, list_type='PERSONAL')
        ok, err, _ = remove_member(personal, self.member)
        self.assertFalse(ok)


class BulkCheckServiceTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username='owner', password='pw')
        self.ul = UserList.objects.create(name='List', owner=self.user, list_type='PERSONAL')
        self.ci = ContentItem.objects.create(source_api='tmdb', external_id='100', content_type='MOVIE')
        ListItem.objects.create(user_list=self.ul, content_item=self.ci, added_by=self.user)

    def test_check_items_readonly(self):
        """check_items_in_lists must NOT create ContentItem rows."""
        before = ContentItem.objects.count()
        items = [{'source_api': 'tmdb', 'external_id': 'nonexistent', 'content_type': 'MOVIE'}]
        result = check_items_in_lists(self.user, items)
        self.assertEqual(ContentItem.objects.count(), before)
        for lst in result['lists']:
            self.assertEqual(lst['matched_count'], 0)

    def test_check_items_finds_existing(self):
        items = [{'source_api': 'tmdb', 'external_id': '100', 'content_type': 'MOVIE'}]
        result = check_items_in_lists(self.user, items)
        lists = {l['name']: l for l in result['lists']}
        self.assertEqual(lists['List']['matched_count'], 1)

    def test_ensure_content_items_creates(self):
        items = [{'source_api': 'igdb', 'external_id': '999', 'content_type': 'GAME'}]
        created = ensure_content_items(items)
        self.assertEqual(len(created), 1)
        self.assertTrue(ContentItem.objects.filter(external_id='999', source_api='igdb').exists())

    def test_ensure_content_items_idempotent(self):
        items = [{'source_api': 'tmdb', 'external_id': '100', 'content_type': 'MOVIE'}]
        before = ContentItem.objects.count()
        ensure_content_items(items)
        self.assertEqual(ContentItem.objects.count(), before)
