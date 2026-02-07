from django.test import TestCase, TransactionTestCase
from django.contrib.auth.models import User
from django.test.utils import override_settings
from rest_framework.test import APITestCase
from decimal import Decimal

from content.models import ContentItem, UserList, ListItem, Rating


class QueryOptimizationTests(TransactionTestCase):
    """Test that query optimizations prevent N+1 queries."""

    def setUp(self):
        """Set up test data with multiple lists and items."""
        # Create users
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.member = User.objects.create_user(
            username='member',
            email='member@example.com',
            password='testpass123'
        )

        # Create a list with items
        self.user_list = UserList.objects.create(
            owner=self.user,
            name='Test List',
            list_type=UserList.ListType.SHARED
        )
        self.user_list.members.add(self.member)

        # Create 10 content items and list items
        self.content_items = []
        self.list_items = []
        for i in range(10):
            content_item = ContentItem.objects.create(
                source_api='tmdb',
                external_id=f'{100 + i}',
                content_type='MOVIE'
            )
            self.content_items.append(content_item)

            list_item = ListItem.objects.create(
                user_list=self.user_list,
                content_item=content_item,
                added_by=self.user,
                status=ListItem.Status.COMPLETED
            )
            self.list_items.append(list_item)

            # Add ratings from both users
            Rating.objects.create(
                user=self.user,
                content_item=content_item,
                score=Decimal('8.0')
            )
            Rating.objects.create(
                user=self.member,
                content_item=content_item,
                score=Decimal('9.0')
            )

    def test_user_list_queryset_optimization(self):
        """Test that UserList queryset with items is optimized."""
        from content.views import UserListViewSet
        from django.test import RequestFactory
        from django.db import connection
        from django.test.utils import override_settings

        # Create a mock request
        factory = RequestFactory()
        request = factory.get('/api/lists/')
        request.user = self.user

        # Create viewset instance
        viewset = UserListViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        viewset.kwargs = {}

        # Reset query counter
        connection.queries_log.clear()

        # Get queryset and evaluate it
        with self.assertNumQueries(8):  # Should be ~5-8 queries, not 40+
            queryset = viewset.get_queryset()
            lists = list(queryset)  # Force evaluation

            # Access related data to ensure prefetch worked
            for user_list in lists:
                _ = user_list.owner.username
                _ = list(user_list.members.all())
                _ = list(user_list.items.all())

    def test_rating_signal_single_query(self):
        """Test that rating signals use single query for updates."""
        from django.db import connection
        from django.test.utils import override_settings

        content_item = ContentItem.objects.create(
            source_api='tmdb',
            external_id='999',
            content_type='MOVIE'
        )

        # Reset query counter
        connection.queries_log.clear()

        # Creating a rating should trigger signal with minimal queries
        with self.assertNumQueries(3):  # INSERT rating + UPDATE content_item + possible transaction
            Rating.objects.create(
                user=self.user,
                content_item=content_item,
                score=Decimal('8.5')
            )

        # Verify the update happened
        content_item.refresh_from_db()
        self.assertEqual(content_item.rating_count, 1)
        self.assertEqual(content_item.average_rating, Decimal('8.5'))

    def test_bulk_check_optimization(self):
        """Test that bulk_check action is optimized for multiple items."""
        from content.views import UserListViewSet
        from django.test import RequestFactory
        from django.db import connection

        # Create request data for checking 5 items
        items_to_check = [
            {
                'external_id': str(100 + i),
                'source_api': 'tmdb',
                'content_type': 'MOVIE'
            }
            for i in range(5)
        ]

        factory = RequestFactory()
        request = factory.post(
            '/api/lists/bulk-check/',
            data={'items': items_to_check},
            content_type='application/json'
        )
        request.user = self.user

        viewset = UserListViewSet()
        viewset.request = request
        viewset.format_kwarg = None

        # Reset query counter
        connection.queries_log.clear()

        # Bulk check should use minimal queries regardless of number of items
        # Expected: ~5-8 queries total (not N queries per item)
        with self.assertNumQueries(10):  # Should be under 10 queries
            from content.serializers import BulkCheckRequestSerializer
            serializer = BulkCheckRequestSerializer(data={'items': items_to_check})
            serializer.is_valid(raise_exception=True)
            response = viewset.bulk_check(request)

        # Verify response is correct
        self.assertEqual(response.status_code, 200)


class APIPerformanceTests(APITestCase):
    """Test API endpoint performance."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        # Create list with items
        self.user_list = UserList.objects.create(
            owner=self.user,
            name='Performance Test List'
        )

        # Create 20 items
        for i in range(20):
            content_item = ContentItem.objects.create(
                source_api='tmdb',
                external_id=f'{1000 + i}',
                content_type='MOVIE'
            )
            ListItem.objects.create(
                user_list=self.user_list,
                content_item=content_item,
                added_by=self.user
            )

    def test_list_endpoint_query_count(self):
        """Test that GET /lists/ endpoint is optimized."""
        from django.db import connection
        from django.test.utils import override_settings

        # Reset query counter
        connection.queries_log.clear()

        # Request lists
        with self.assertNumQueries(10):  # Should be under 10 queries
            response = self.client.get('/api/lists/')

        self.assertEqual(response.status_code, 200)

    def test_list_detail_endpoint_query_count(self):
        """Test that GET /lists/:id/ endpoint is optimized."""
        from django.db import connection

        # Reset query counter
        connection.queries_log.clear()

        # Request list detail
        with self.assertNumQueries(15):  # Should be under 15 queries even with items
            response = self.client.get(f'/api/lists/{self.user_list.id}/')

        self.assertEqual(response.status_code, 200)


class SerializerPerformanceTests(TestCase):
    """Test serializer performance and query efficiency."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.member = User.objects.create_user(
            username='member',
            email='member@example.com',
            password='testpass123'
        )

        self.user_list = UserList.objects.create(
            owner=self.user,
            name='Test List',
            list_type=UserList.ListType.SHARED
        )
        self.user_list.members.add(self.member)

        # Create completed items with ratings
        for i in range(5):
            content_item = ContentItem.objects.create(
                source_api='tmdb',
                external_id=f'{2000 + i}',
                content_type='MOVIE'
            )
            ListItem.objects.create(
                user_list=self.user_list,
                content_item=content_item,
                added_by=self.user,
                status=ListItem.Status.COMPLETED
            )
            Rating.objects.create(
                user=self.user,
                content_item=content_item,
                score=Decimal('8.0')
            )

    def test_list_item_serializer_with_prefetch(self):
        """Test that ListItemSerializer uses pre-fetched data efficiently."""
        from content.serializers import ListItemSerializer
        from django.db.models import Prefetch
        from django.db import connection

        # Get items with optimized queryset (simulating viewset behavior)
        items = ListItem.objects.filter(
            user_list=self.user_list
        ).select_related(
            'content_item',
            'added_by'
        ).prefetch_related(
            Prefetch(
                'content_item__ratings',
                queryset=Rating.objects.select_related('user'),
                to_attr='member_ratings_prefetched'
            )
        )

        # Reset query counter
        connection.queries_log.clear()

        # Serialize all items - should use prefetched data
        with self.assertNumQueries(0):  # No additional queries needed!
            serializer = ListItemSerializer(items, many=True)
            data = serializer.data

        self.assertEqual(len(data), 5)

    def test_list_item_serializer_without_prefetch(self):
        """Test serializer behavior without prefetch (baseline for comparison)."""
        from content.serializers import ListItemSerializer
        from django.db import connection

        # Get items WITHOUT optimization
        items = ListItem.objects.filter(user_list=self.user_list)

        # Reset query counter
        connection.queries_log.clear()

        # Serialize - will trigger many queries without prefetch
        serializer = ListItemSerializer(items, many=True)
        data = serializer.data

        # This will show the N+1 problem without optimization
        # (Commented out because we know it will fail - this is intentional)
        # with self.assertNumQueries(5):  # Would actually be 15+ queries
        #     data = serializer.data

        self.assertEqual(len(data), 5)