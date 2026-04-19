from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from django.urls import reverse


class ErrorHandlingTests(APITestCase):
    """Test that the custom exception handler preserves structured errors."""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.client.force_authenticate(user=self.user)

    def test_validation_error_preserves_field_info(self):
        """DRF validation errors should preserve per-field messages."""
        url = reverse('content:lists:list-list')
        response = self.client.post(url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'VALIDATION_ERROR')
        self.assertIn('fields', response.data)
        self.assertIn('name', response.data['fields'])

    def test_api_error_still_works(self):
        """Custom APIError subclasses should still produce their own shape."""
        from content.models import UserList, ListItem, ContentItem

        user_list = UserList.objects.create(name='Test', owner=self.user)
        ci = ContentItem.objects.create(source_api='tmdb', external_id='1', content_type='MOVIE')
        ListItem.objects.create(user_list=user_list, content_item=ci, added_by=self.user)

        url = reverse('content:lists:items-list', kwargs={'list_pk': user_list.id})
        data = {'source_api': 'tmdb', 'external_id': '1', 'content_type': 'MOVIE'}
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'DUPLICATE_ITEM')
        self.assertIn('existing_item_id', response.data)

    def test_not_found_returns_structured_error(self):
        url = '/api/content/lists/99999/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['error'], 'NOT_FOUND')

    def test_unauthenticated_returns_structured_error(self):
        self.client.force_authenticate(user=None)
        url = reverse('content:lists:list-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['error'], 'UNAUTHORIZED')
