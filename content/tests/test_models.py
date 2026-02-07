"""
Tests for Content app models.

Tests model constraints, validations, and business logic.
"""
from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth.models import User
from decimal import Decimal

from content.models import ContentItem, UserList, ListItem, Rating


class ContentItemModelTests(TestCase):
    """Test ContentItem model constraints and behavior."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_unique_constraint_prevents_duplicates(self):
        """Test that unique constraint on (source_api, external_id, content_type) works."""
        ContentItem.objects.create(
            source_api='tmdb',
            external_id='123',
            content_type='MOVIE'
        )

        # Attempting to create duplicate should raise IntegrityError
        with self.assertRaises(IntegrityError):
            ContentItem.objects.create(
                source_api='tmdb',
                external_id='123',
                content_type='MOVIE'
            )

    def test_different_content_types_allowed_same_external_id(self):
        """Test that same external_id can exist for different content types."""
        item1 = ContentItem.objects.create(
            source_api='tmdb',
            external_id='123',
            content_type='MOVIE'
        )
        item2 = ContentItem.objects.create(
            source_api='tmdb',
            external_id='123',
            content_type='TV_SHOW'
        )

        self.assertNotEqual(item1.id, item2.id)
        self.assertEqual(ContentItem.objects.count(), 2)

    def test_default_rating_values(self):
        """Test that default rating values are set correctly."""
        item = ContentItem.objects.create(
            source_api='tmdb',
            external_id='456',
            content_type='MOVIE'
        )

        self.assertEqual(item.rating_count, 0)
        self.assertIsNone(item.average_rating)

    def test_string_representation(self):
        """Test __str__ method returns expected format."""
        item = ContentItem.objects.create(
            source_api='tmdb',
            external_id='789',
            content_type='GAME'
        )

        expected = "GAME - tmdb:789"
        self.assertEqual(str(item), expected)


class UserListModelTests(TestCase):
    """Test UserList model constraints and behavior."""

    def setUp(self):
        """Set up test data."""
        self.owner = User.objects.create_user(
            username='owner',
            email='owner@example.com',
            password='testpass123'
        )
        self.member = User.objects.create_user(
            username='member',
            email='member@example.com',
            password='testpass123'
        )

    def test_shared_list_auto_adds_owner_as_member(self):
        """Test that shared lists automatically add owner to members."""
        user_list = UserList.objects.create(
            owner=self.owner,
            name='Shared List',
            list_type=UserList.ListType.SHARED
        )

        # Owner should be automatically added to members
        self.assertIn(self.owner, user_list.members.all())

    def test_personal_list_does_not_auto_add_owner(self):
        """Test that personal lists don't automatically add owner to members."""
        user_list = UserList.objects.create(
            owner=self.owner,
            name='Personal List',
            list_type=UserList.ListType.PERSONAL
        )

        # Members should be empty for personal lists
        self.assertEqual(user_list.members.count(), 0)

    def test_ordering_by_created_at_descending(self):
        """Test that lists are ordered by creation date (newest first)."""
        list1 = UserList.objects.create(
            owner=self.owner,
            name='First List'
        )
        list2 = UserList.objects.create(
            owner=self.owner,
            name='Second List'
        )
        list3 = UserList.objects.create(
            owner=self.owner,
            name='Third List'
        )

        lists = UserList.objects.all()
        self.assertEqual(lists[0].id, list3.id)  # Newest first
        self.assertEqual(lists[1].id, list2.id)
        self.assertEqual(lists[2].id, list1.id)

    def test_string_representation(self):
        """Test __str__ method returns expected format."""
        user_list = UserList.objects.create(
            owner=self.owner,
            name='My Watchlist'
        )

        expected = "My Watchlist (owner)"
        self.assertEqual(str(user_list), expected)


class ListItemModelTests(TestCase):
    """Test ListItem model constraints and behavior."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.user_list = UserList.objects.create(
            owner=self.user,
            name='Test List'
        )
        self.content_item = ContentItem.objects.create(
            source_api='tmdb',
            external_id='123',
            content_type='MOVIE'
        )

    def test_auto_increment_list_order(self):
        """Test that list_order is automatically incremented."""
        item1 = ListItem.objects.create(
            user_list=self.user_list,
            content_item=self.content_item,
            added_by=self.user
        )

        content_item2 = ContentItem.objects.create(
            source_api='tmdb',
            external_id='456',
            content_type='MOVIE'
        )
        item2 = ListItem.objects.create(
            user_list=self.user_list,
            content_item=content_item2,
            added_by=self.user
        )

        self.assertEqual(item1.list_order, 1)
        self.assertEqual(item2.list_order, 2)

    def test_completed_status_sets_timestamp(self):
        """Test that setting status to COMPLETED sets completed_at timestamp."""
        item = ListItem.objects.create(
            user_list=self.user_list,
            content_item=self.content_item,
            added_by=self.user,
            status=ListItem.Status.PENDING
        )

        self.assertIsNone(item.completed_at)

        # Mark as completed
        item.status = ListItem.Status.COMPLETED
        item.save()

        item.refresh_from_db()
        self.assertIsNotNone(item.completed_at)

    def test_pending_status_clears_timestamp(self):
        """Test that changing status back to PENDING clears completed_at."""
        item = ListItem.objects.create(
            user_list=self.user_list,
            content_item=self.content_item,
            added_by=self.user,
            status=ListItem.Status.COMPLETED
        )

        self.assertIsNotNone(item.completed_at)

        # Change back to pending
        item.status = ListItem.Status.PENDING
        item.save()

        item.refresh_from_db()
        self.assertIsNone(item.completed_at)

    def test_unique_list_order_per_list_constraint(self):
        """Test that list_order must be unique within a list."""
        ListItem.objects.create(
            user_list=self.user_list,
            content_item=self.content_item,
            added_by=self.user,
            list_order=1
        )

        content_item2 = ContentItem.objects.create(
            source_api='tmdb',
            external_id='789',
            content_type='MOVIE'
        )

        # Attempting to create item with same list_order should fail
        with self.assertRaises(IntegrityError):
            ListItem.objects.create(
                user_list=self.user_list,
                content_item=content_item2,
                added_by=self.user,
                list_order=1
            )


class RatingModelTests(TestCase):
    """Test Rating model constraints and behavior."""

    def setUp(self):
        """Set up test data."""
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123'
        )
        self.content_item = ContentItem.objects.create(
            source_api='tmdb',
            external_id='123',
            content_type='MOVIE'
        )

    def test_unique_user_rating_constraint(self):
        """Test that a user can only rate a content item once."""
        Rating.objects.create(
            user=self.user1,
            content_item=self.content_item,
            score=Decimal('8.5')
        )

        # Attempting to create duplicate rating should fail
        with self.assertRaises(IntegrityError):
            Rating.objects.create(
                user=self.user1,
                content_item=self.content_item,
                score=Decimal('9.0')
            )

    def test_multiple_users_can_rate_same_content(self):
        """Test that multiple users can rate the same content."""
        rating1 = Rating.objects.create(
            user=self.user1,
            content_item=self.content_item,
            score=Decimal('8.5')
        )
        rating2 = Rating.objects.create(
            user=self.user2,
            content_item=self.content_item,
            score=Decimal('9.0')
        )

        self.assertEqual(Rating.objects.filter(content_item=self.content_item).count(), 2)
        self.assertNotEqual(rating1.id, rating2.id)

    def test_score_validation(self):
        """Test that score validation works (0.5 to 10.0)."""
        # Valid scores should work
        valid_scores = [Decimal('0.5'), Decimal('5.0'), Decimal('10.0')]
        for score in valid_scores:
            rating = Rating(
                user=self.user1,
                content_item=self.content_item,
                score=score
            )
            rating.full_clean()  # Should not raise ValidationError

    def test_ordering_by_created_at_descending(self):
        """Test that ratings are ordered by creation date (newest first)."""
        rating1 = Rating.objects.create(
            user=self.user1,
            content_item=self.content_item,
            score=Decimal('8.0')
        )

        content_item2 = ContentItem.objects.create(
            source_api='tmdb',
            external_id='456',
            content_type='MOVIE'
        )
        rating2 = Rating.objects.create(
            user=self.user1,
            content_item=content_item2,
            score=Decimal('9.0')
        )

        ratings = Rating.objects.all()
        self.assertEqual(ratings[0].id, rating2.id)  # Newest first
        self.assertEqual(ratings[1].id, rating1.id)

    def test_string_representation(self):
        """Test __str__ method returns expected format."""
        rating = Rating.objects.create(
            user=self.user1,
            content_item=self.content_item,
            score=Decimal('8.5')
        )

        self.assertIn('user1', str(rating))
        self.assertIn('8.5', str(rating))
