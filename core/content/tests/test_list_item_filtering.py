from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from content.models import UserList, ListItem, ContentItem


class ListItemFilteringTests(APITestCase):
    """
    Test suite for list item filtering functionality.

    Tests the performance optimization feature that allows filtering items
    in the lists endpoint by external_id, source_api, and content_type.
    """

    def setUp(self):
        """Set up test data with multiple lists and items"""
        # Create test user
        self.user = User.objects.create_user(username='testuser', password='password')
        self.client.force_authenticate(user=self.user)

        # Create test lists
        self.watchlist = UserList.objects.create(
            name='Watchlist',
            owner=self.user,
            list_type=UserList.ListType.PERSONAL
        )

        self.horror_list = UserList.objects.create(
            name='Horror Movies',
            owner=self.user,
            list_type=UserList.ListType.PERSONAL
        )

        self.shared_list = UserList.objects.create(
            name='To Watch',
            owner=self.user,
            list_type=UserList.ListType.SHARED
        )

        # Create content items
        # Movie: Alien Romulus (TMDB: 945961)
        self.alien_movie = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='945961',
            content_type=ContentItem.ContentType.MOVIE
        )

        # Movie: Another movie (TMDB: 123456)
        self.other_movie = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='123456',
            content_type=ContentItem.ContentType.MOVIE
        )

        # TV Show: Breaking Bad (TMDB: 1396)
        self.breaking_bad_show = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='1396',
            content_type=ContentItem.ContentType.TV_SHOW
        )

        # Season: Breaking Bad Season 1 (TMDB: 1396:1)
        self.breaking_bad_season1 = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='1396:1',
            content_type=ContentItem.ContentType.SEASON
        )

        # Game: The Witcher 3 (IGDB: 1942)
        self.witcher_game = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.IGDB,
            external_id='1942',
            content_type=ContentItem.ContentType.GAME
        )

        # Album: Random Access Memories (Spotify: 4m2880jivSbbyEGAKfITCa)
        self.album = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.SPOTIFY,
            external_id='4m2880jivSbbyEGAKfITCa',
            content_type=ContentItem.ContentType.ALBUM
        )

        # Add items to lists
        # Watchlist: Alien Romulus, Other Movie, Breaking Bad S1
        ListItem.objects.create(
            user_list=self.watchlist,
            content_item=self.alien_movie,
            added_by=self.user,
            list_order=1
        )
        ListItem.objects.create(
            user_list=self.watchlist,
            content_item=self.other_movie,
            added_by=self.user,
            list_order=2
        )
        ListItem.objects.create(
            user_list=self.watchlist,
            content_item=self.breaking_bad_season1,
            added_by=self.user,
            list_order=3
        )

        # Horror Movies: Other Movie only
        ListItem.objects.create(
            user_list=self.horror_list,
            content_item=self.other_movie,
            added_by=self.user,
            list_order=1
        )

        # Shared List: Alien Romulus, Witcher Game
        ListItem.objects.create(
            user_list=self.shared_list,
            content_item=self.alien_movie,
            added_by=self.user,
            list_order=1
        )
        ListItem.objects.create(
            user_list=self.shared_list,
            content_item=self.witcher_game,
            added_by=self.user,
            list_order=2
        )

    def test_no_filters_returns_all_items(self):
        """Test that without filters, all items are returned (current behavior)"""
        url = reverse('content:lists:list-list')
        response = self.client.get(url, {
            'items_size': 100,
            'fields': 'id,name,items.id'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Find our lists in the response
        lists = {lst['name']: lst for lst in response.data['results']}

        # Watchlist should have 3 items
        self.assertEqual(len(lists['Watchlist']['items']), 3)

        # Horror Movies should have 1 item
        self.assertEqual(len(lists['Horror Movies']['items']), 1)

        # Shared list should have 2 items
        self.assertEqual(len(lists['To Watch']['items']), 2)

    def test_filter_by_external_id_only(self):
        """Test filtering by external_id only"""
        url = reverse('content:lists:list-list')
        response = self.client.get(url, {
            'items_size': 100,
            'filter_external_id': '945961',
            'fields': 'id,name,items.id,items.content_item.external_id'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        lists = {lst['name']: lst for lst in response.data['results']}

        # Watchlist should have Alien Romulus
        self.assertEqual(len(lists['Watchlist']['items']), 1)
        self.assertEqual(lists['Watchlist']['items'][0]['content_item']['external_id'], '945961')

        # Horror Movies should have no matching items
        self.assertEqual(len(lists['Horror Movies']['items']), 0)

        # Shared list should have Alien Romulus
        self.assertEqual(len(lists['To Watch']['items']), 1)
        self.assertEqual(lists['To Watch']['items'][0]['content_item']['external_id'], '945961')

    def test_filter_by_all_three_criteria(self):
        """Test filtering with all three filters (logical AND)"""
        url = reverse('content:lists:list-list')
        response = self.client.get(url, {
            'items_size': 100,
            'filter_external_id': '945961',
            'filter_source_api': 'TMDB',
            'filter_content_type': 'MOVIE',
            'fields': 'id,name,items.id,items.content_item.external_id,items.content_item.source_api,items.content_item.content_type'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        lists = {lst['name']: lst for lst in response.data['results']}

        # Watchlist should have Alien Romulus
        self.assertEqual(len(lists['Watchlist']['items']), 1)
        item = lists['Watchlist']['items'][0]['content_item']
        self.assertEqual(item['external_id'], '945961')
        self.assertEqual(item['source_api'], 'tmdb')
        self.assertEqual(item['content_type'], 'MOVIE')

        # Horror Movies should have no matching items
        self.assertEqual(len(lists['Horror Movies']['items']), 0)

        # Shared list should have Alien Romulus
        self.assertEqual(len(lists['To Watch']['items']), 1)

    def test_filter_season_with_colon_in_external_id(self):
        """Test filtering seasons which use colon notation (e.g., '1396:1')"""
        url = reverse('content:lists:list-list')
        response = self.client.get(url, {
            'items_size': 100,
            'filter_external_id': '1396:1',
            'filter_source_api': 'TMDB',
            'filter_content_type': 'SEASON',
            'fields': 'id,name,items.id,items.content_item.external_id'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        lists = {lst['name']: lst for lst in response.data['results']}

        # Watchlist should have Breaking Bad Season 1
        self.assertEqual(len(lists['Watchlist']['items']), 1)
        self.assertEqual(lists['Watchlist']['items'][0]['content_item']['external_id'], '1396:1')

        # Other lists should not have this season
        self.assertEqual(len(lists['Horror Movies']['items']), 0)
        self.assertEqual(len(lists['To Watch']['items']), 0)

    def test_filter_source_api_case_insensitive(self):
        """Test that source_api filter is case insensitive"""
        url = reverse('content:lists:list-list')

        # Test with lowercase
        response_lower = self.client.get(url, {
            'items_size': 100,
            'filter_external_id': '945961',
            'filter_source_api': 'tmdb',
            'filter_content_type': 'MOVIE',
            'fields': 'id,name,items.id'
        })

        # Test with uppercase
        response_upper = self.client.get(url, {
            'items_size': 100,
            'filter_external_id': '945961',
            'filter_source_api': 'TMDB',
            'filter_content_type': 'MOVIE',
            'fields': 'id,name,items.id'
        })

        self.assertEqual(response_lower.status_code, status.HTTP_200_OK)
        self.assertEqual(response_upper.status_code, status.HTTP_200_OK)

        # Both should return the same results
        lower_lists = {lst['name']: lst for lst in response_lower.data['results']}
        upper_lists = {lst['name']: lst for lst in response_upper.data['results']}

        self.assertEqual(len(lower_lists['Watchlist']['items']), 1)
        self.assertEqual(len(upper_lists['Watchlist']['items']), 1)

    def test_filter_content_type_case_insensitive(self):
        """Test that content_type filter is case insensitive"""
        url = reverse('content:lists:list-list')

        # Test with lowercase
        response_lower = self.client.get(url, {
            'items_size': 100,
            'filter_external_id': '945961',
            'filter_content_type': 'movie',
            'fields': 'id,name,items.id'
        })

        # Test with uppercase
        response_upper = self.client.get(url, {
            'items_size': 100,
            'filter_external_id': '945961',
            'filter_content_type': 'MOVIE',
            'fields': 'id,name,items.id'
        })

        self.assertEqual(response_lower.status_code, status.HTTP_200_OK)
        self.assertEqual(response_upper.status_code, status.HTTP_200_OK)

        # Both should return the same results
        lower_lists = {lst['name']: lst for lst in response_lower.data['results']}
        upper_lists = {lst['name']: lst for lst in response_upper.data['results']}

        self.assertEqual(len(lower_lists['Watchlist']['items']), 1)
        self.assertEqual(len(upper_lists['Watchlist']['items']), 1)

    def test_filter_no_matches_returns_empty_array(self):
        """Test that lists with no matching items return empty items array"""
        url = reverse('content:lists:list-list')
        response = self.client.get(url, {
            'items_size': 100,
            'filter_external_id': 'nonexistent',
            'filter_source_api': 'TMDB',
            'filter_content_type': 'MOVIE',
            'fields': 'id,name,items.id'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # All lists should be returned but with empty items arrays
        for lst in response.data['results']:
            self.assertEqual(len(lst['items']), 0)

    def test_filter_with_different_source_apis(self):
        """Test filtering for non-TMDB sources (IGDB, Spotify)"""
        # Test IGDB
        url = reverse('content:lists:list-list')
        response = self.client.get(url, {
            'items_size': 100,
            'filter_external_id': '1942',
            'filter_source_api': 'IGDB',
            'filter_content_type': 'GAME',
            'fields': 'id,name,items.id'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lists = {lst['name']: lst for lst in response.data['results']}

        # Only shared list should have the game
        self.assertEqual(len(lists['Watchlist']['items']), 0)
        self.assertEqual(len(lists['Horror Movies']['items']), 0)
        self.assertEqual(len(lists['To Watch']['items']), 1)

    def test_filter_with_items_size_limit(self):
        """Test that filtering works correctly with items_size parameter"""
        url = reverse('content:lists:list-list')
        response = self.client.get(url, {
            'items_size': 1,  # Limit to 1 item per list
            'filter_external_id': '945961',
            'fields': 'id,name,items.id'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        lists = {lst['name']: lst for lst in response.data['results']}

        # Even with items_size=1, filtering should apply
        # Watchlist has the filtered item
        self.assertEqual(len(lists['Watchlist']['items']), 1)

        # Horror Movies has no matching items
        self.assertEqual(len(lists['Horror Movies']['items']), 0)

        # Shared list has the filtered item
        self.assertEqual(len(lists['To Watch']['items']), 1)

    def test_filter_partial_criteria_logical_and(self):
        """Test that partial filters still work (not all three filters required)"""
        # Filter by source_api and content_type only
        url = reverse('content:lists:list-list')
        response = self.client.get(url, {
            'items_size': 100,
            'filter_source_api': 'TMDB',
            'filter_content_type': 'MOVIE',
            'fields': 'id,name,items.id'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        lists = {lst['name']: lst for lst in response.data['results']}

        # Watchlist should have 2 TMDB movies (Alien Romulus, Other Movie)
        self.assertEqual(len(lists['Watchlist']['items']), 2)

        # Horror Movies should have 1 TMDB movie
        self.assertEqual(len(lists['Horror Movies']['items']), 1)

        # Shared list should have 1 TMDB movie
        self.assertEqual(len(lists['To Watch']['items']), 1)

    def test_backward_compatibility_without_filters(self):
        """Test that the endpoint works exactly as before when no filters are provided"""
        url = reverse('content:lists:list-list')
        response = self.client.get(url, {
            'items_size': 100,
            'fields': 'id,name,item_count'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        lists = {lst['name']: lst for lst in response.data['results']}

        # All lists should be present
        self.assertIn('Watchlist', lists)
        self.assertIn('Horror Movies', lists)
        self.assertIn('To Watch', lists)

        # Item counts should be correct
        self.assertEqual(lists['Watchlist']['item_count'], 3)
        self.assertEqual(lists['Horror Movies']['item_count'], 1)
        self.assertEqual(lists['To Watch']['item_count'], 2)
