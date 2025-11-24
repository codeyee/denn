from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from proxy.views.search import MultiSearchView


class MultiSearchViewTests(TestCase):
    """
    Test suite for BE-202: Multi-search endpoint
    """

    def setUp(self):
        self.client = APIClient()
        self.url = reverse('proxy:multi-search')

    def patch_client(self, content_type, return_value=None, side_effect=None):
        """
        Helper to patch the client class for a specific content type
        """
        mock_instance = MagicMock()
        if return_value:
            # Setup methods based on content type
            if content_type == 'MOVIES':
                mock_instance.search_movies.return_value = return_value
            elif content_type == 'TV_SHOWS':
                mock_instance.search_tv_shows.return_value = return_value
            elif content_type == 'GAMES':
                mock_instance.search_games.return_value = return_value
            elif content_type == 'ALBUMS':
                mock_instance.search.return_value = return_value
            elif content_type == 'BOOKS':
                mock_instance.search.return_value = return_value
        
        if side_effect:
            if content_type == 'MOVIES':
                mock_instance.search_movies.side_effect = side_effect
            # Add others if needed

        mock_class = MagicMock(return_value=mock_instance)
        
        patcher = patch.dict(MultiSearchView.CONTENT_TYPE_HANDLERS[content_type], {'client_class': mock_class})
        patcher.start()
        self.addCleanup(patcher.stop)
        
        return mock_instance

    def test_missing_query_parameter_returns_400(self):
        """
        Test case: Request without query parameter
        Expected: 400 Bad Request
        """
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'MISSING_PARAMETER')

    def test_search_all_types_default(self):
        """
        Test case: Search without types parameter searches all types
        Expected: All 5 content types in response and non-empty where data exists
        """
        # Mock TMDB responses
        self.patch_client('MOVIES', ({'results': [{'id': 1, 'title': 'Movie', 'media_type': 'movie'}]}, 200))
        self.patch_client('TV_SHOWS', ({'results': [{'id': 1, 'name': 'TV', 'media_type': 'tv'}]}, 200))
        
        # Mock IGDB responses
        self.patch_client('GAMES', ([{'id': 1, 'name': 'Game'}], 200))
        
        # Mock Spotify responses
        self.patch_client('ALBUMS', ({'albums': {'items': [{'id': '1', 'name': 'Album'}]}}, 200))
        
        # Mock OpenLibrary responses
        self.patch_client('BOOKS', ({'docs': [{'key': '/works/OL1W', 'title': 'Book'}]}, 200))

        response = self.client.get(self.url, {'query': 'inception'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('movies', response.data)
        self.assertIn('tv_shows', response.data)
        self.assertIn('games', response.data)
        self.assertIn('music', response.data)
        self.assertIn('books', response.data)
        
        # Verify data is actually present (this verifies the mapping works)
        self.assertEqual(len(response.data['movies']), 1)
        self.assertEqual(len(response.data['tv_shows']), 1)
        self.assertEqual(len(response.data['games']), 1)
        self.assertEqual(len(response.data['music']), 1)
        self.assertEqual(len(response.data['books']), 1)

    def test_search_specific_types_only(self):
        """
        Test case: Search with specific types parameter
        Expected: Only requested types are searched
        """
        mock_tmdb = self.patch_client('MOVIES', ({'results': []}, 200))
        
        # Use a fresh mock for IGDB to verify it's NOT called
        mock_igdb_class = MagicMock()
        with patch.dict(MultiSearchView.CONTENT_TYPE_HANDLERS['GAMES'], {'client_class': mock_igdb_class}):
            response = self.client.get(self.url, {'query': 'inception', 'types': 'MOVIES'})

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            # Movies should have been called
            mock_tmdb.search_movies.assert_called_once()
            # IGDB should NOT have been instantiated
            mock_igdb_class.assert_not_called()

    def test_invalid_content_type_returns_400(self):
        """
        Test case: Invalid content type in types parameter
        Expected: 400 Bad Request with clear error message
        """
        response = self.client.get(self.url, {'query': 'test', 'types': 'INVALID_TYPE'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'INVALID_PARAMETER')
        self.assertIn('Invalid content type', response.data['message'])

    def test_limit_parameter_validation(self):
        """
        Test case: Limit parameter validation
        Expected: Accepts valid limits, rejects invalid
        """
        # Test limit too low
        response = self.client.get(self.url, {'query': 'test', 'limit': '0'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Test limit too high
        response = self.client.get(self.url, {'query': 'test', 'limit': '101'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Test non-integer limit
        response = self.client.get(self.url, {'query': 'test', 'limit': 'abc'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_multiple_types_comma_separated(self):
        """
        Test case: Multiple types as comma-separated string
        Expected: Searches only specified types
        """
        mock_tmdb = self.patch_client('MOVIES', ({'results': []}, 200))
        mock_igdb = self.patch_client('GAMES', ([], 200))

        response = self.client.get(self.url, {'query': 'test', 'types': 'MOVIES,GAMES'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_tmdb.search_movies.assert_called_once()
        mock_igdb.search_games.assert_called_once()

    def test_api_error_returns_empty_array(self):
        """
        Test case: External API error
        Expected: Returns empty array for that type, not full failure
        """
        self.patch_client('MOVIES', side_effect=Exception("API Error"))

        response = self.client.get(self.url, {'query': 'test', 'types': 'MOVIES'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['movies'], [])

    def test_response_format_matches_homepage(self):
        """
        Test case: Response structure
        Expected: Matches homepage format with movies, tv_shows, games, music, books
        """
        self.patch_client('MOVIES', ({'results': []}, 200))

        response = self.client.get(self.url, {'query': 'test', 'types': 'MOVIES'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check all expected keys exist
        expected_keys = {'movies', 'tv_shows', 'games', 'music', 'books'}
        self.assertEqual(set(response.data.keys()), expected_keys)
        # All should be lists
        for key in expected_keys:
            self.assertIsInstance(response.data[key], list)

    def test_limit_parameter_applied_correctly(self):
        """
        Test case: Limit parameter limits results per type
        Expected: Results respect limit parameter
        """
        # Create mock results (50 items)
        mock_results = [{'id': i, 'title': f'Movie {i}', 'media_type': 'movie'} for i in range(50)]

        self.patch_client('MOVIES', ({'results': mock_results}, 200))
        
        # We need to ensure the mapper is real or behaves correctly. 
        # Since we only patched the client, the real mapper is used.
        # The real TMDBMapper will map these items.

        response = self.client.get(self.url, {'query': 'test', 'types': 'MOVIES', 'limit': '10'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return exactly 10 items
        self.assertEqual(len(response.data['movies']), 10)

    def test_case_insensitive_type_parameter(self):
        """
        Test case: Types parameter is case-insensitive
        Expected: Accepts lowercase, uppercase, mixed case
        """
        self.patch_client('MOVIES', ({'results': []}, 200))

        # Test lowercase
        response = self.client.get(self.url, {'query': 'test', 'types': 'movies'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test mixed case
        response = self.client.get(self.url, {'query': 'test', 'types': 'MoViEs'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_whitespace_in_types_parameter_handled(self):
        """
        Test case: Whitespace in types parameter
        Expected: Handles spaces around commas correctly
        """
        self.patch_client('MOVIES', ({'results': []}, 200))
        self.patch_client('TV_SHOWS', ({'results': []}, 200))

        response = self.client.get(self.url, {'query': 'test', 'types': 'MOVIES , TV_SHOWS'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_person_results_filtered_out(self):
        """
        Test case: TMDB person results are filtered out
        Expected: Only non-person results returned
        """
        mock_results = [
            {'id': 1, 'title': 'Movie 1', 'media_type': 'movie'},
            {'id': 2, 'name': 'Actor Name', 'media_type': 'person'},
            {'id': 3, 'title': 'Movie 2', 'media_type': 'movie'},
        ]

        self.patch_client('MOVIES', ({'results': mock_results}, 200))

        response = self.client.get(self.url, {'query': 'test', 'types': 'MOVIES'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only have 2 items (persons filtered out)
        self.assertEqual(len(response.data['movies']), 2)
