from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock


class MultiSearchViewTests(TestCase):
    """
    Test suite for BE-202: Multi-search endpoint
    """

    def setUp(self):
        self.client = APIClient()
        self.url = reverse('proxy:multi-search')

    def test_missing_query_parameter_returns_400(self):
        """
        Test case: Request without query parameter
        Expected: 400 Bad Request
        """
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'MISSING_PARAMETER')

    @patch('proxy.views.search.TMDBClient')
    @patch('proxy.views.search.IGDBClient')
    @patch('proxy.views.search.SpotifyClient')
    @patch('proxy.views.search.OpenLibraryClient')
    def test_search_all_types_default(self, mock_ol, mock_spotify, mock_igdb, mock_tmdb):
        """
        Test case: Search without types parameter searches all types
        Expected: All 5 content types in response
        """
        # Mock TMDB responses
        mock_tmdb_instance = MagicMock()
        mock_tmdb_instance.search_movies.return_value = ({'results': []}, 200)
        mock_tmdb_instance.search_tv_shows.return_value = ({'results': []}, 200)
        mock_tmdb.return_value = mock_tmdb_instance

        # Mock IGDB responses
        mock_igdb_instance = MagicMock()
        mock_igdb_instance.search_games.return_value = ([], 200)
        mock_igdb.return_value = mock_igdb_instance

        # Mock Spotify responses
        mock_spotify_instance = MagicMock()
        mock_spotify_instance.search.return_value = ({'albums': {'items': []}}, 200)
        mock_spotify.return_value = mock_spotify_instance

        # Mock OpenLibrary responses
        mock_ol_instance = MagicMock()
        mock_ol_instance.search.return_value = ({'docs': []}, 200)
        mock_ol.return_value = mock_ol_instance

        response = self.client.get(self.url, {'query': 'inception'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('movies', response.data)
        self.assertIn('tv_shows', response.data)
        self.assertIn('games', response.data)
        self.assertIn('music', response.data)
        self.assertIn('books', response.data)

    @patch('proxy.views.search.TMDBClient')
    def test_search_specific_types_only(self, mock_tmdb):
        """
        Test case: Search with specific types parameter
        Expected: Only requested types are searched
        """
        mock_tmdb_instance = MagicMock()
        mock_tmdb_instance.search_movies.return_value = ({'results': []}, 200)
        mock_tmdb.return_value = mock_tmdb_instance

        response = self.client.get(self.url, {'query': 'inception', 'types': 'MOVIES'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Only movies should have been called
        mock_tmdb_instance.search_movies.assert_called_once()

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

    @patch('proxy.views.search.TMDBClient')
    @patch('proxy.views.search.IGDBClient')
    def test_multiple_types_comma_separated(self, mock_igdb, mock_tmdb):
        """
        Test case: Multiple types as comma-separated string
        Expected: Searches only specified types
        """
        mock_tmdb_instance = MagicMock()
        mock_tmdb_instance.search_movies.return_value = ({'results': []}, 200)
        mock_tmdb.return_value = mock_tmdb_instance

        mock_igdb_instance = MagicMock()
        mock_igdb_instance.search_games.return_value = ([], 200)
        mock_igdb.return_value = mock_igdb_instance

        response = self.client.get(self.url, {'query': 'test', 'types': 'MOVIES,GAMES'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_tmdb_instance.search_movies.assert_called_once()
        mock_igdb_instance.search_games.assert_called_once()

    @patch('proxy.views.search.TMDBClient')
    def test_api_error_returns_empty_array(self, mock_tmdb):
        """
        Test case: External API error
        Expected: Returns empty array for that type, not full failure
        """
        mock_tmdb_instance = MagicMock()
        mock_tmdb_instance.search_movies.side_effect = Exception("API Error")
        mock_tmdb.return_value = mock_tmdb_instance

        response = self.client.get(self.url, {'query': 'test', 'types': 'MOVIES'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['movies'], [])

    @patch('proxy.views.search.TMDBClient')
    @patch('proxy.views.search.TMDBMapper')
    def test_response_format_matches_homepage(self, mock_mapper, mock_tmdb):
        """
        Test case: Response structure
        Expected: Matches homepage format with movies, tv_shows, games, music, books
        """
        mock_tmdb_instance = MagicMock()
        mock_tmdb_instance.search_movies.return_value = ({'results': []}, 200)
        mock_tmdb.return_value = mock_tmdb_instance

        response = self.client.get(self.url, {'query': 'test', 'types': 'MOVIES'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check all expected keys exist
        expected_keys = {'movies', 'tv_shows', 'games', 'music', 'books'}
        self.assertEqual(set(response.data.keys()), expected_keys)
        # All should be lists
        for key in expected_keys:
            self.assertIsInstance(response.data[key], list)

    @patch('proxy.views.search.TMDBClient')
    def test_limit_parameter_applied_correctly(self, mock_tmdb):
        """
        Test case: Limit parameter limits results per type
        Expected: Results respect limit parameter
        """
        # Create mock results (50 items)
        mock_results = [{'id': i, 'title': f'Movie {i}'} for i in range(50)]

        mock_tmdb_instance = MagicMock()
        mock_tmdb_instance.search_movies.return_value = ({'results': mock_results}, 200)
        mock_tmdb.return_value = mock_tmdb_instance

        # Mock mapper
        with patch('proxy.views.search.TMDBMapper') as mock_mapper_class:
            mock_mapper = MagicMock()
            mock_mapped_item = MagicMock()
            mock_mapped_item.to_dict.return_value = {'id': 1}
            mock_mapper.map_search_item.return_value = mock_mapped_item
            mock_mapper_class.return_value = mock_mapper

            response = self.client.get(self.url, {'query': 'test', 'types': 'MOVIES', 'limit': '10'})

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            # Should have called map_search_item max 10 times (due to limit)
            self.assertLessEqual(mock_mapper.map_search_item.call_count, 10)

    @patch('proxy.views.search.TMDBClient')
    @patch('proxy.views.search.IGDBClient')
    @patch('proxy.views.search.SpotifyClient')
    @patch('proxy.views.search.OpenLibraryClient')
    def test_case_insensitive_type_parameter(self, mock_ol, mock_spotify, mock_igdb, mock_tmdb):
        """
        Test case: Types parameter is case-insensitive
        Expected: Accepts lowercase, uppercase, mixed case
        """
        mock_tmdb_instance = MagicMock()
        mock_tmdb_instance.search_movies.return_value = ({'results': []}, 200)
        mock_tmdb.return_value = mock_tmdb_instance

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
        with patch('proxy.views.search.TMDBClient') as mock_tmdb:
            mock_tmdb_instance = MagicMock()
            mock_tmdb_instance.search_movies.return_value = ({'results': []}, 200)
            mock_tmdb.return_value = mock_tmdb_instance

            response = self.client.get(self.url, {'query': 'test', 'types': 'MOVIES , TV_SHOWS'})
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('proxy.views.search.TMDBClient')
    def test_person_results_filtered_out(self, mock_tmdb):
        """
        Test case: TMDB person results are filtered out
        Expected: Only non-person results returned
        """
        mock_results = [
            {'id': 1, 'title': 'Movie 1', 'media_type': 'movie'},
            {'id': 2, 'name': 'Actor Name', 'media_type': 'person'},
            {'id': 3, 'title': 'Movie 2', 'media_type': 'movie'},
        ]

        mock_tmdb_instance = MagicMock()
        mock_tmdb_instance.search_movies.return_value = ({'results': mock_results}, 200)
        mock_tmdb.return_value = mock_tmdb_instance

        with patch('proxy.views.search.TMDBMapper') as mock_mapper_class:
            mock_mapper = MagicMock()
            mock_mapped_item = MagicMock()
            mock_mapped_item.to_dict.return_value = {'id': 1}
            mock_mapper.map_search_item.return_value = mock_mapped_item
            mock_mapper_class.return_value = mock_mapper

            response = self.client.get(self.url, {'query': 'test', 'types': 'MOVIES'})

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            # Should only map non-person results (2 items, not 3)
            self.assertEqual(mock_mapper.map_search_item.call_count, 2)
