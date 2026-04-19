"""Sprint 07 / PR-7C: id-first public routing for content items."""
from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from content.models import ContentItem


class ContentItemDetailByIdViewTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='u', password='p')
        self.client.force_authenticate(user=self.user)
        self.item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='550',
            content_type=ContentItem.ContentType.MOVIE,
        )

    def test_detail_by_id_returns_item_with_source_data_included(self):
        url = reverse('content:content-detail-by-id', kwargs={'id': self.item.pk})
        with patch('content.utils.fetch_source_data', return_value={'title': 'Fight Club'}):
            response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.item.pk)
        self.assertEqual(response.data['external_id'], '550')
        self.assertEqual(response.data['source_data'], {'title': 'Fight Club'})

    def test_detail_by_id_404_for_unknown(self):
        url = reverse('content:content-detail-by-id', kwargs={'id': 999_999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ContentItemGetOrCreateAliasTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='u', password='p')
        self.client.force_authenticate(user=self.user)

    def test_top_level_get_or_create_creates_item(self):
        url = reverse('content:content-get-or-create')
        payload = {
            'source_api': ContentItem.SourceAPI.TMDB,
            'external_id': '603',
            'content_type': ContentItem.ContentType.MOVIE,
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ContentItem.objects.filter(external_id='603').exists())

    def test_top_level_get_or_create_returns_existing(self):
        ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='603',
            content_type=ContentItem.ContentType.MOVIE,
        )
        url = reverse('content:content-get-or-create')
        payload = {
            'source_api': ContentItem.SourceAPI.TMDB,
            'external_id': '603',
            'content_type': ContentItem.ContentType.MOVIE,
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class LegacyContentRedirectTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='u', password='p')
        self.client.force_authenticate(user=self.user)

    def test_legacy_query_redirects_301(self):
        url = reverse('content:content-legacy-redirect')
        response = self.client.get(url, {
            'external_id': '550',
            'source_api': ContentItem.SourceAPI.TMDB,
            'content_type': ContentItem.ContentType.MOVIE,
        })
        self.assertEqual(response.status_code, status.HTTP_301_MOVED_PERMANENTLY)
        item = ContentItem.objects.get(external_id='550')
        self.assertIn(f'/api/content/{item.pk}/', response['Location'])

    def test_missing_params_returns_400(self):
        url = reverse('content:content-legacy-redirect')
        response = self.client.get(url, {'external_id': '550'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
