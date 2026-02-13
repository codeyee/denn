from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from content.models import UserList, ListItem, ContentItem
from unittest.mock import patch

class FlexFieldsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.client.force_authenticate(user=self.user)
        
        self.user_list = UserList.objects.create(
            name='Test List',
            owner=self.user,
            list_type=UserList.ListType.PERSONAL
        )
        
        self.content_item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='123',
            content_type=ContentItem.ContentType.MOVIE
        )
        
        self.list_item = ListItem.objects.create(
            user_list=self.user_list,
            content_item=self.content_item,
            added_by=self.user,
            list_order=1
        )
        
        self.source_data = {'title': 'Test Movie', 'cover': {'url': 'http://example.com/image.jpg'}}

    def test_fields_parameter(self):
        """Test that ?fields parameter restricts returned fields"""
        url = reverse('content:lists:items-list', kwargs={'list_pk': self.user_list.id})
        response = self.client.get(url, {'fields': 'id,status'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data['results']) > 0)
        item = response.data['results'][0]
        self.assertEqual(set(item.keys()), {'id', 'status'})

    def test_expand_parameter(self):
        """Test that ?expand parameter expands relationships"""
        url = reverse('content:lists:items-list', kwargs={'list_pk': self.user_list.id})
        response = self.client.get(url, {'expand': 'content_item'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = response.data['results'][0]
        self.assertIsInstance(item['content_item'], dict)
        self.assertEqual(item['content_item']['id'], self.content_item.id)

    @patch('content.views.list_item.bulk_fetch_source_data')
    @patch('content.utils.fetch_source_data')
    def test_source_fields_parameter(self, mock_fetch, mock_bulk_fetch):
        """Test that ?source_fields parameter filters source_data"""
        mock_fetch.return_value = self.source_data
        mock_bulk_fetch.return_value = {self.content_item.id: self.source_data}
        
        url = reverse('content:lists:items-list', kwargs={'list_pk': self.user_list.id})
        # Expand content_item to see source_data, and filter source_fields
        response = self.client.get(url, {
            'expand': 'content_item',
            'source_fields': 'title'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = response.data['results'][0]
        source_data = item['content_item']['source_data']
        self.assertEqual(source_data, {'title': 'Test Movie'})
        self.assertNotIn('cover', source_data)

    @patch('content.views.list_item.bulk_fetch_source_data')
    @patch('content.utils.fetch_source_data')
    def test_nested_source_fields(self, mock_fetch, mock_bulk_fetch):
        """Test dot notation for source_fields"""
        mock_fetch.return_value = self.source_data
        
        # Mock bulk fetch to return a dict mapping ID to source_data
        # We need to know the ID of the item. self.content_item.id
        mock_bulk_fetch.return_value = {self.content_item.id: self.source_data}
        
        url = reverse('content:lists:items-list', kwargs={'list_pk': self.user_list.id})
        response = self.client.get(url, {
            'expand': 'content_item',
            'source_fields': 'cover.url'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = response.data['results'][0]
        source_data = item['content_item']['source_data']
        self.assertEqual(source_data, {'cover': {'url': 'http://example.com/image.jpg'}})
        self.assertNotIn('title', source_data)
