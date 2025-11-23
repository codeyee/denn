from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch, MagicMock
from proxy.utils import filter_dictionary

from django.contrib.auth.models import User

class ProxyDynamicFieldsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.client.force_authenticate(user=self.user)

    def test_filter_dictionary(self):
        data = {
            'id': 1,
            'title': 'Test',
            'nested': {
                'a': 1,
                'b': 2
            },
            'list': [
                {'x': 1, 'y': 2},
                {'x': 3, 'y': 4}
            ]
        }
        
        # Test simple fields
        result = filter_dictionary(data, ['id', 'title'])
        self.assertEqual(result, {'id': 1, 'title': 'Test'})
        
        # Test nested fields
        result = filter_dictionary(data, ['nested.a'])
        self.assertEqual(result, {'nested': {'a': 1}})
        
        # Test mixed
        result = filter_dictionary(data, ['id', 'nested.b'])
        self.assertEqual(result, {'id': 1, 'nested': {'b': 2}})

    def test_filter_dictionary_nested_list(self):
        data = {
            'id': 1,
            'seasons': [
                {'id': 10, 'name': 'S1', 'episodes': [{'id': 100, 'name': 'E1'}]},
                {'id': 11, 'name': 'S2', 'episodes': [{'id': 101, 'name': 'E2'}]}
            ]
        }
        
        # Test filtering fields inside a list
        result = filter_dictionary(data, ['id', 'seasons.name'])
        self.assertEqual(result, {
            'id': 1,
            'seasons': [
                {'name': 'S1'},
                {'name': 'S2'}
            ]
        })

        # Test deep nesting inside a list
        result = filter_dictionary(data, ['seasons.episodes.name'])
        self.assertEqual(result, {
            'seasons': [
                {'episodes': [{'name': 'E1'}]},
                {'episodes': [{'name': 'E2'}]}
            ]
        })

    @patch('proxy.views.base.TMDBClient')
    def test_movie_fields(self, mock_client_class):
        mock_client = mock_client_class.return_value
        mock_client.get_movie_details.return_value = ({
            'id': 123,
            'title': 'Test Movie',
            'overview': 'Description',
            'poster_path': '/path.jpg',
            'external_ids': {},
            'watch/providers': {},
            'images': {}
        }, 200)
        
        url = reverse('proxy:movies:detail', kwargs={'movie_id': 123})
        response = self.client.get(url, {'fields': 'id,title'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'id': 123, 'title': 'Test Movie'})
        self.assertNotIn('description', response.data)

    @patch('proxy.views.base.TMDBClient')
    def test_tv_show_fields(self, mock_client_class):
        mock_client = mock_client_class.return_value
        mock_client.get_tv_details.return_value = ({
            'id': 456,
            'name': 'Test Show',
            'overview': 'Description',
            'poster_path': '/path.jpg',
            'seasons': [],
            'external_ids': {},
            'watch/providers': {},
            'images': {}
        }, 200)
        
        url = reverse('proxy:tv_shows:detail', kwargs={'tv_id': 456})
        response = self.client.get(url, {'fields': 'id,title'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'id': 456, 'title': 'Test Show'})

    @patch('proxy.views.base.TMDBClient')
    def test_tv_show_expand_seasons(self, mock_client_class):
        mock_client = mock_client_class.return_value
        
        # Mock TV details
        mock_client.get_tv_details.return_value = ({
            'id': 456,
            'name': 'Test Show',
            'seasons': [
                {'season_number': 1, 'episode_count': 10, 'air_date': '2023-01-01'}
            ],
            'external_ids': {},
            'watch/providers': {},
            'images': {}
        }, 200)
        
        # Mock bulk seasons
        mock_client.get_bulk_seasons.return_value = ([{
            'season_number': 1,
            'status_code': 200,
            'data': {
                'id': 1,
                'season_number': 1,
                'name': 'Season 1',
                'episodes': [
                    {'id': 1, 'episode_number': 1, 'name': 'Ep 1'}
                ]
            }
        }], 200)
        
        url = reverse('proxy:tv_shows:detail', kwargs={'tv_id': 456})
        response = self.client.get(url, {'expand': 'seasons'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['seasons']), 1)
        self.assertEqual(len(response.data['seasons'][0]['episodes']), 1)
        self.assertEqual(response.data['seasons'][0]['episodes'][0]['title'], 'Ep 1')
