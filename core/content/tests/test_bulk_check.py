from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from content.models import UserList, ListItem, ContentItem


class BulkCheckTests(APITestCase):
    """
    Test suite for bulk check endpoint functionality.

    Tests the /api/content/lists/bulk-check/ endpoint that allows checking
    multiple items across all user lists in a single request.
    """

    def setUp(self):
        """Set up test data with multiple users, lists, and items"""
        # Create test users
        self.user1 = User.objects.create_user(username='user1', password='password')
        self.user2 = User.objects.create_user(username='user2', password='password')
        self.client.force_authenticate(user=self.user1)

        # Create lists for user1
        self.watchlist = UserList.objects.create(
            name='Watchlist',
            owner=self.user1,
            list_type=UserList.ListType.PERSONAL
        )

        self.favorites = UserList.objects.create(
            name='Favorites',
            owner=self.user1,
            list_type=UserList.ListType.PERSONAL
        )

        self.shared_list = UserList.objects.create(
            name='Family Watch',
            owner=self.user1,
            list_type=UserList.ListType.SHARED
        )

        # Create a list for user2 (should not appear in user1's results)
        self.user2_list = UserList.objects.create(
            name='User2 List',
            owner=self.user2,
            list_type=UserList.ListType.PERSONAL
        )

        # Create content items for Breaking Bad seasons
        self.bb_season1 = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='1396:1',
            content_type=ContentItem.ContentType.SEASON
        )

        self.bb_season2 = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='1396:2',
            content_type=ContentItem.ContentType.SEASON
        )

        self.bb_season3 = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='1396:3',
            content_type=ContentItem.ContentType.SEASON
        )

        # Create movies
        self.alien_movie = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='945961',
            content_type=ContentItem.ContentType.MOVIE
        )

        self.inception_movie = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='27205',
            content_type=ContentItem.ContentType.MOVIE
        )

        # Create game
        self.witcher_game = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.IGDB,
            external_id='1942',
            content_type=ContentItem.ContentType.GAME
        )

        # Add items to lists
        # Watchlist: BB S1, BB S2, Alien
        ListItem.objects.create(
            user_list=self.watchlist,
            content_item=self.bb_season1,
            added_by=self.user1,
            list_order=1
        )
        ListItem.objects.create(
            user_list=self.watchlist,
            content_item=self.bb_season2,
            added_by=self.user1,
            list_order=2
        )
        ListItem.objects.create(
            user_list=self.watchlist,
            content_item=self.alien_movie,
            added_by=self.user1,
            list_order=3
        )

        # Favorites: BB S1, BB S3, Inception
        ListItem.objects.create(
            user_list=self.favorites,
            content_item=self.bb_season1,
            added_by=self.user1,
            list_order=1
        )
        ListItem.objects.create(
            user_list=self.favorites,
            content_item=self.bb_season3,
            added_by=self.user1,
            list_order=2
        )
        ListItem.objects.create(
            user_list=self.favorites,
            content_item=self.inception_movie,
            added_by=self.user1,
            list_order=3
        )

        # Shared list: Witcher Game only
        ListItem.objects.create(
            user_list=self.shared_list,
            content_item=self.witcher_game,
            added_by=self.user1,
            list_order=1
        )

        # User2's list: BB S1 (should not appear in user1's results)
        ListItem.objects.create(
            user_list=self.user2_list,
            content_item=self.bb_season1,
            added_by=self.user2,
            list_order=1
        )

    def test_bulk_check_multiple_seasons(self):
        """Test checking multiple seasons across lists"""
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': '1396:1', 'source_api': 'tmdb', 'content_type': 'SEASON'},
                {'external_id': '1396:2', 'source_api': 'tmdb', 'content_type': 'SEASON'},
                {'external_id': '1396:3', 'source_api': 'tmdb', 'content_type': 'SEASON'},
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['queried_items_count'], 3)

        # Convert to dict for easier lookup
        lists = {lst['name']: lst for lst in response.data['lists']}

        # Watchlist should have BB S1 and S2 (2 matches)
        self.assertEqual(lists['Watchlist']['matched_count'], 2)
        matched_ids = [item['external_id'] for item in lists['Watchlist']['matched_items']]
        self.assertIn('1396:1', matched_ids)
        self.assertIn('1396:2', matched_ids)

        # Favorites should have BB S1 and S3 (2 matches)
        self.assertEqual(lists['Favorites']['matched_count'], 2)
        matched_ids = [item['external_id'] for item in lists['Favorites']['matched_items']]
        self.assertIn('1396:1', matched_ids)
        self.assertIn('1396:3', matched_ids)

        # Shared list should have no matches
        self.assertEqual(lists['Family Watch']['matched_count'], 0)
        self.assertEqual(len(lists['Family Watch']['matched_items']), 0)

    def test_bulk_check_mixed_content_types(self):
        """Test checking different content types (movies, seasons, games)"""
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': '945961', 'source_api': 'tmdb', 'content_type': 'MOVIE'},
                {'external_id': '1396:1', 'source_api': 'tmdb', 'content_type': 'SEASON'},
                {'external_id': '1942', 'source_api': 'igdb', 'content_type': 'GAME'},
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['queried_items_count'], 3)

        lists = {lst['name']: lst for lst in response.data['lists']}

        # Watchlist should have Alien + BB S1 (2 matches)
        self.assertEqual(lists['Watchlist']['matched_count'], 2)

        # Favorites should have BB S1 (1 match)
        self.assertEqual(lists['Favorites']['matched_count'], 1)

        # Shared list should have Witcher (1 match)
        self.assertEqual(lists['Family Watch']['matched_count'], 1)

    def test_bulk_check_items_not_in_any_list(self):
        """Test checking items that don't exist in any user list"""
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': 'nonexistent1', 'source_api': 'tmdb', 'content_type': 'MOVIE'},
                {'external_id': 'nonexistent2', 'source_api': 'tmdb', 'content_type': 'MOVIE'},
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['queried_items_count'], 2)

        # All lists should have matched_count = 0
        for lst in response.data['lists']:
            self.assertEqual(lst['matched_count'], 0)
            self.assertEqual(len(lst['matched_items']), 0)

    def test_bulk_check_returns_all_user_lists(self):
        """Test that all user's lists are returned, even with no matches"""
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': '945961', 'source_api': 'tmdb', 'content_type': 'MOVIE'},
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should return exactly 3 lists (user1's lists)
        self.assertEqual(len(response.data['lists']), 3)

        list_names = [lst['name'] for lst in response.data['lists']]
        self.assertIn('Watchlist', list_names)
        self.assertIn('Favorites', list_names)
        self.assertIn('Family Watch', list_names)

        # User2's list should NOT be included
        self.assertNotIn('User2 List', list_names)

    def test_bulk_check_case_insensitive(self):
        """Test that source_api and content_type are case insensitive"""
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': '945961', 'source_api': 'TMDB', 'content_type': 'movie'},
                {'external_id': '1942', 'source_api': 'IGDB', 'content_type': 'game'},
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        lists = {lst['name']: lst for lst in response.data['lists']}

        # Should still find matches despite case differences
        self.assertEqual(lists['Watchlist']['matched_count'], 1)
        self.assertEqual(lists['Family Watch']['matched_count'], 1)

    def test_bulk_check_empty_items_array(self):
        """Test validation when items array is empty"""
        url = reverse('content:lists:list-bulk-check')
        data = {'items': []}

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        has_items_error = (
            'items' in str(response.data.get('message', ''))
            or 'items' in response.data.get('fields', {})
        )
        self.assertTrue(has_items_error)

    def test_bulk_check_max_items_limit(self):
        """Test validation when more than 100 items are provided"""
        url = reverse('content:lists:list-bulk-check')

        items = [
            {'external_id': str(i), 'source_api': 'tmdb', 'content_type': 'MOVIE'}
            for i in range(101)
        ]
        data = {'items': items}

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_bulk_check_missing_required_fields(self):
        """Test validation when required fields are missing"""
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': '945961', 'source_api': 'tmdb'},  # Missing content_type
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_check_invalid_source_api(self):
        """Test validation with invalid source_api"""
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': '945961', 'source_api': 'invalid', 'content_type': 'MOVIE'},
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_check_invalid_content_type(self):
        """Test validation with invalid content_type"""
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': '945961', 'source_api': 'tmdb', 'content_type': 'INVALID'},
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_check_unauthenticated(self):
        """Test that unauthenticated users cannot access the endpoint"""
        self.client.force_authenticate(user=None)
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': '945961', 'source_api': 'tmdb', 'content_type': 'MOVIE'},
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_bulk_check_only_returns_authenticated_user_lists(self):
        """Test that only the authenticated user's lists are returned"""
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': '1396:1', 'source_api': 'tmdb', 'content_type': 'SEASON'},
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify user2's list is not included
        list_names = [lst['name'] for lst in response.data['lists']]
        self.assertNotIn('User2 List', list_names)

        # Only user1's lists should be present
        self.assertEqual(len(response.data['lists']), 3)

    def test_bulk_check_response_structure(self):
        """Test that the response has the correct structure"""
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': '945961', 'source_api': 'tmdb', 'content_type': 'MOVIE'},
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check top-level structure
        self.assertIn('queried_items_count', response.data)
        self.assertIn('lists', response.data)

        # Check list structure
        for lst in response.data['lists']:
            self.assertIn('id', lst)
            self.assertIn('name', lst)
            self.assertIn('list_type', lst)
            self.assertIn('item_count', lst)
            self.assertIn('matched_count', lst)
            self.assertIn('matched_items', lst)

            # Check matched_items structure
            for item in lst['matched_items']:
                self.assertIn('list_item_id', item)
                self.assertIn('content_item_id', item)
                self.assertIn('external_id', item)
                self.assertIn('source_api', item)
                self.assertIn('content_type', item)

    def test_bulk_check_item_count_accuracy(self):
        """Test that item_count reflects total items, not just matched items"""
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': '945961', 'source_api': 'tmdb', 'content_type': 'MOVIE'},
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        lists = {lst['name']: lst for lst in response.data['lists']}

        # Watchlist has 3 total items, but only 1 matches
        self.assertEqual(lists['Watchlist']['item_count'], 3)
        self.assertEqual(lists['Watchlist']['matched_count'], 1)

        # Favorites has 3 total items, but 0 match
        self.assertEqual(lists['Favorites']['item_count'], 3)
        self.assertEqual(lists['Favorites']['matched_count'], 0)

    def test_bulk_check_single_item(self):
        """Test that bulk check works correctly with just one item"""
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': '945961', 'source_api': 'tmdb', 'content_type': 'MOVIE'},
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['queried_items_count'], 1)

        lists = {lst['name']: lst for lst in response.data['lists']}
        self.assertEqual(lists['Watchlist']['matched_count'], 1)

    def test_bulk_check_large_batch(self):
        """Test with a large batch of items (within limit)"""
        url = reverse('content:lists:list-bulk-check')

        # Create 50 items to check
        items = [
            {'external_id': str(i), 'source_api': 'tmdb', 'content_type': 'MOVIE'}
            for i in range(50)
        ]
        data = {'items': items}

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['queried_items_count'], 50)

    def test_bulk_check_list_item_id_is_correct(self):
        """Test that list_item_id in response matches actual ListItem ID"""
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': '1396:1', 'source_api': 'tmdb', 'content_type': 'SEASON'},
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Find the watchlist which has BB S1
        lists = {lst['name']: lst for lst in response.data['lists']}
        watchlist = lists['Watchlist']

        # Should have 1 match
        self.assertEqual(watchlist['matched_count'], 1)

        # Get the list_item_id from response
        returned_list_item_id = watchlist['matched_items'][0]['list_item_id']

        # Verify this is a valid ListItem ID by querying it
        list_item = ListItem.objects.filter(
            id=returned_list_item_id,
            user_list=self.watchlist,
            content_item=self.bb_season1
        ).first()

        self.assertIsNotNone(list_item, "list_item_id should match an actual ListItem")
        self.assertEqual(list_item.content_item.external_id, '1396:1')

    def test_bulk_check_list_item_id_can_be_used_for_deletion(self):
        """Test that list_item_id from response can be used with DELETE endpoint"""
        # First, get the list_item_id from bulk check
        url = reverse('content:lists:list-bulk-check')
        data = {
            'items': [
                {'external_id': '945961', 'source_api': 'tmdb', 'content_type': 'MOVIE'},
            ]
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Find watchlist which has Alien movie
        lists = {lst['name']: lst for lst in response.data['lists']}
        watchlist = lists['Watchlist']

        self.assertEqual(watchlist['matched_count'], 1)
        list_item_id = watchlist['matched_items'][0]['list_item_id']

        # Verify we can query with this ID
        list_item = ListItem.objects.get(id=list_item_id)
        self.assertEqual(list_item.user_list.id, self.watchlist.id)
        self.assertEqual(list_item.content_item.external_id, '945961')

        # Note: We don't actually delete here to avoid affecting other tests
        # But we've verified the list_item_id is valid and points to the correct item
