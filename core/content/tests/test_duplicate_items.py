from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from content.models import (
    UserList,
    ListItem,
    ContentItem,
    UserContentTracking,
)


class DuplicateItemValidationTests(APITestCase):
    """
    Test suite for BE-203: Duplicate item validation
    """

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(username='testuser', password='password')
        self.client.force_authenticate(user=self.user)

        # Create test list
        self.user_list = UserList.objects.create(
            name='Test List',
            owner=self.user,
            list_type=UserList.ListType.PERSONAL
        )

        # Create another list for cross-list testing
        self.another_list = UserList.objects.create(
            name='Another List',
            owner=self.user,
            list_type=UserList.ListType.PERSONAL
        )

    def test_first_item_add_succeeds(self):
        """
        Test case: Add item for the first time
        Expected: 201 Created
        """
        url = reverse('content:lists:items-list', kwargs={'list_pk': self.user_list.id})
        data = {
            'source_api': 'tmdb',
            'external_id': '101',
            'content_type': 'MOVIE',
            'context_status': 'PENDING'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertIsNone(response.data['context_status'])
        tracking = UserContentTracking.objects.get(
            user=self.user,
            content_item__external_id='101',
        )
        self.assertEqual(
            tracking.status,
            UserContentTracking.Status.BACKLOG,
        )

    def test_duplicate_item_returns_400(self):
        """
        Test case: Add same item again to the same list
        Expected: 400 Bad Request with DUPLICATE_ITEM error
        """
        url = reverse('content:lists:items-list', kwargs={'list_pk': self.user_list.id})
        data = {
            'source_api': 'tmdb',
            'external_id': '101',
            'content_type': 'MOVIE',
            'context_status': 'PENDING'
        }

        # First add - should succeed
        first_response = self.client.post(url, data, format='json')
        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        first_item_id = first_response.data['id']

        # Second add - should fail with duplicate error
        second_response = self.client.post(url, data, format='json')

        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', second_response.data)
        self.assertEqual(second_response.data['error'], 'DUPLICATE_ITEM')
        self.assertIn('message', second_response.data)
        self.assertEqual(second_response.data['message'], 'This item is already in the list')
        self.assertIn('existing_item_id', second_response.data)
        self.assertEqual(second_response.data['existing_item_id'], first_item_id)

    def test_duplicate_validation_includes_existing_item_details(self):
        """
        Test case: Error response includes existing item details
        Expected: Response contains existing_item with id, added_at, status
        """
        url = reverse('content:lists:items-list', kwargs={'list_pk': self.user_list.id})
        data = {
            'source_api': 'tmdb',
            'external_id': '101',
            'content_type': 'MOVIE',
            'context_status': 'PENDING'
        }

        # First add
        first_response = self.client.post(url, data, format='json')
        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)

        # Second add - check error details
        second_response = self.client.post(url, data, format='json')

        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('existing_item', second_response.data)

        existing_item = second_response.data['existing_item']
        self.assertIn('id', existing_item)
        self.assertIn('added_at', existing_item)
        self.assertIn('context_status', existing_item)
        self.assertIsNone(existing_item['context_status'])

    def test_same_item_different_list_allowed(self):
        """
        Test case: Add same item to different list
        Expected: 201 Created (allowed)
        """
        # Add to first list
        url1 = reverse('content:lists:items-list', kwargs={'list_pk': self.user_list.id})
        data = {
            'source_api': 'tmdb',
            'external_id': '101',
            'content_type': 'MOVIE',
            'context_status': 'PENDING'
        }
        response1 = self.client.post(url1, data, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        tracking = UserContentTracking.objects.get(
            user=self.user,
            content_item__external_id='101',
        )
        tracking.status = UserContentTracking.Status.COMPLETED
        tracking.save(update_fields=['status', 'updated_at'])

        # Add same item to different list - should succeed
        url2 = reverse('content:lists:items-list', kwargs={'list_pk': self.another_list.id})
        response2 = self.client.post(url2, data, format='json')

        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(response1.data['id'], response2.data['id'])
        tracking.refresh_from_db()
        self.assertEqual(
            tracking.status,
            UserContentTracking.Status.COMPLETED,
        )
        self.assertEqual(
            UserContentTracking.objects.filter(
                user=self.user,
                content_item=tracking.content_item,
            ).count(),
            1,
        )

    def test_shared_list_does_not_create_personal_tracking(self):
        shared_list = UserList.objects.create(
            name='Shared List',
            owner=self.user,
            list_type=UserList.ListType.SHARED,
        )
        url = reverse(
            'content:lists:items-list',
            kwargs={'list_pk': shared_list.id},
        )

        response = self.client.post(
            url,
            {
                'source_api': 'tmdb',
                'external_id': 'shared-101',
                'content_type': 'MOVIE',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(
            UserContentTracking.objects.filter(
                user=self.user,
                content_item__external_id='shared-101',
            ).exists()
        )

    def test_duplicate_with_different_status_still_fails(self):
        """
        Test case: Try to add duplicate with different status
        Expected: 400 Bad Request (still a duplicate)
        """
        url = reverse('content:lists:items-list', kwargs={'list_pk': self.user_list.id})

        # Add as PENDING
        data1 = {
            'source_api': 'tmdb',
            'external_id': '101',
            'content_type': 'MOVIE',
            'context_status': 'PENDING'
        }
        response1 = self.client.post(url, data1, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Try to add same item as COMPLETED
        data2 = {
            'source_api': 'tmdb',
            'external_id': '101',
            'content_type': 'MOVIE',
            'context_status': 'COMPLETED'
        }
        response2 = self.client.post(url, data2, format='json')

        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response2.data['error'], 'DUPLICATE_ITEM')

    def test_duplicate_detection_works_for_all_content_types(self):
        """
        Test case: Duplicate detection works for movies, TV shows, games, albums, books
        Expected: All content types properly validate duplicates
        """
        test_cases = [
            {'source_api': 'tmdb', 'external_id': '101', 'content_type': 'MOVIE'},
            {'source_api': 'tmdb', 'external_id': '102', 'content_type': 'TV_SHOW'},
            {'source_api': 'igdb', 'external_id': '103', 'content_type': 'GAME'},
            {'source_api': 'spotify', 'external_id': '104', 'content_type': 'ALBUM'},
            {'source_api': 'openlibrary', 'external_id': '105', 'content_type': 'BOOK'},
        ]

        url = reverse('content:lists:items-list', kwargs={'list_pk': self.user_list.id})

        for test_data in test_cases:
            # First add should succeed
            response1 = self.client.post(url, test_data, format='json')
            self.assertEqual(response1.status_code, status.HTTP_201_CREATED,
                           f"First add failed for {test_data['content_type']}")

            # Duplicate should fail
            response2 = self.client.post(url, test_data, format='json')
            self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST,
                           f"Duplicate not detected for {test_data['content_type']}")
            self.assertEqual(response2.data['error'], 'DUPLICATE_ITEM')

    def test_duplicate_detection_case_sensitive_external_id(self):
        """
        Test case: External IDs are case-sensitive for duplicate detection
        Expected: Different case = different items (allowed)
        """
        url = reverse('content:lists:items-list', kwargs={'list_pk': self.user_list.id})

        # Add with lowercase external_id
        data1 = {
            'source_api': 'tmdb',
            'external_id': 'abc123',
            'content_type': 'MOVIE'
        }
        response1 = self.client.post(url, data1, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Add with uppercase external_id (different item)
        data2 = {
            'source_api': 'tmdb',
            'external_id': 'ABC123',
            'content_type': 'MOVIE'
        }
        response2 = self.client.post(url, data2, format='json')
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(response1.data['id'], response2.data['id'])

    def test_error_message_is_user_friendly(self):
        """
        Test case: Error message should be clear and user-friendly
        Expected: Message clearly explains the issue
        """
        url = reverse('content:lists:items-list', kwargs={'list_pk': self.user_list.id})
        data = {
            'source_api': 'tmdb',
            'external_id': '101',
            'content_type': 'MOVIE'
        }

        # First add
        self.client.post(url, data, format='json')

        # Second add - check message
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('message', response.data)

        message = response.data['message']
        # Message should be clear and not technical
        self.assertIn('already in the list', message.lower())

    def test_duplicate_check_after_content_item_creation(self):
        """
        Test case: Duplicate check happens after ContentItem is created
        Expected: Duplicate detection works even if ContentItem didn't exist before
        """
        url = reverse('content:lists:items-list', kwargs={'list_pk': self.user_list.id})
        data = {
            'source_api': 'tmdb',
            'external_id': 'new-item-999',
            'content_type': 'MOVIE'
        }

        # Verify ContentItem doesn't exist yet
        content_item_exists = ContentItem.objects.filter(
            source_api='tmdb',
            external_id='new-item-999',
            content_type='MOVIE'
        ).exists()
        self.assertFalse(content_item_exists)

        # First add - creates ContentItem and ListItem
        response1 = self.client.post(url, data, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Verify ContentItem now exists
        content_item_exists = ContentItem.objects.filter(
            source_api='tmdb',
            external_id='new-item-999',
            content_type='MOVIE'
        ).exists()
        self.assertTrue(content_item_exists)

        # Second add - should still detect duplicate
        response2 = self.client.post(url, data, format='json')
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response2.data['error'], 'DUPLICATE_ITEM')
