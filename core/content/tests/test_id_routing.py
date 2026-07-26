"""Sprint 07 / PR-7C: id-first public routing for content items."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from time import sleep
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import OperationalError, close_old_connections, connection
from django.test import TransactionTestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.request import Request
from rest_framework.test import APITestCase, APIRequestFactory

from content.models import ContentItem, Rating
from core.throttling import CatalogDetailRateThrottle


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
        with patch(
            'content.services.source_data_orchestrator._proxy_fetch',
            return_value={self.item.pk: {'title': 'Fight Club'}},
        ):
            response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.item.pk)
        self.assertEqual(response.data['external_id'], '550')
        self.assertEqual(response.data['source_data'], {'title': 'Fight Club'})

    def test_detail_includes_current_user_rating_without_secondary_endpoint(self):
        rating = Rating.objects.create(
            user=self.user,
            content_item=self.item,
            score='8.5',
            comment='Great',
        )
        url = reverse('content:content-detail-by-id', kwargs={'id': self.item.pk})
        with patch(
            'content.services.source_data_orchestrator._proxy_fetch',
            return_value={self.item.pk: {'title': 'Fight Club'}},
        ):
            response = self.client.get(url)

        self.assertEqual(response.data['current_user_rating']['id'], rating.id)
        self.assertEqual(
            response.data['current_user_rating']['user']['username'],
            self.user.username,
        )

    def test_detail_by_id_404_for_unknown(self):
        url = reverse('content:content-detail-by-id', kwargs={'id': 999_999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_anonymous_detail_is_public_without_personal_rating_data(self):
        Rating.objects.create(
            user=self.user,
            content_item=self.item,
            score='8.5',
            comment='Private viewer state',
        )
        self.client.force_authenticate(user=None)
        url = reverse('content:content-detail-by-id', kwargs={'id': self.item.pk})

        with patch(
            'content.services.source_data_orchestrator._proxy_fetch',
            return_value={self.item.pk: {'title': 'Fight Club'}},
        ):
            response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['current_user_rating'])
        self.assertNotContains(response, 'Private viewer state')


class CatalogDetailThrottleTests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_anonymous_catalog_detail_quota_is_60_per_minute(self):
        raw_request = self.factory.get(
            '/api/content/1/',
            HTTP_X_CATALOG_VISITOR='c' * 64,
            REMOTE_ADDR='203.0.113.10',
        )
        request = Request(raw_request, authenticators=[])
        throttle = CatalogDetailRateThrottle()

        self.assertTrue(throttle.allow_request(request, None))
        self.assertEqual(throttle.num_requests, 60)
        self.assertEqual(throttle.duration, 60)

    def test_authenticated_catalog_detail_quota_is_120_per_minute(self):
        user = get_user_model().objects.create_user(username='throttled-user')
        raw_request = self.factory.get(
            '/api/content/1/',
            HTTP_X_CATALOG_VISITOR='d' * 64,
            REMOTE_ADDR='203.0.113.10',
        )
        raw_request.user = user
        request = Request(raw_request, authenticators=[])
        request.user = user
        throttle = CatalogDetailRateThrottle()

        self.assertTrue(throttle.allow_request(request, None))
        self.assertEqual(throttle.num_requests, 120)
        self.assertEqual(throttle.duration, 60)

    @override_settings(PROXY_API_KEY='catalog-service-key')
    def test_trusted_web_visitors_do_not_share_a_throttle_bucket(self):
        first = self._cache_key('a' * 64, api_key='catalog-service-key')
        second = self._cache_key('b' * 64, api_key='catalog-service-key')

        self.assertNotEqual(first, second)
        self.assertIn(f'visitor:{"a" * 64}', first)
        self.assertIn(f'visitor:{"b" * 64}', second)

    @override_settings(PROXY_API_KEY='catalog-service-key')
    def test_untrusted_visitor_header_falls_back_to_source_ip(self):
        first = self._cache_key('a' * 64)
        second = self._cache_key('b' * 64)

        self.assertEqual(first, second)
        self.assertIn('ip:203.0.113.10', first)

    def _cache_key(self, visitor, api_key=''):
        raw_request = self.factory.get(
            '/api/content/1/',
            HTTP_X_API_CONSUMER='web',
            HTTP_X_API_KEY=api_key,
            HTTP_X_CATALOG_VISITOR=visitor,
            REMOTE_ADDR='203.0.113.10',
        )
        request = Request(raw_request, authenticators=[])
        return CatalogDetailRateThrottle().get_cache_key(request, None)


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


class ContentItemBulkResolveTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='u', password='p')
        self.client.force_authenticate(user=self.user)
        self.url = reverse('content:content-resolve-ids')

    def test_resolves_idempotently_without_trusting_provider_payload(self):
        request_data = {
            'items': [{
                'source_api': ContentItem.SourceAPI.TMDB,
                'external_id': '77',
                'content_type': ContentItem.ContentType.MOVIE,
                'source_data': {'id': 'spoofed', 'title': 'Untrusted'},
            }],
        }

        first = self.client.post(self.url, request_data, format='json')
        second = self.client.post(self.url, request_data, format='json')

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data['results'][0]['id'], second.data['results'][0]['id'])
        self.assertEqual(ContentItem.objects.filter(external_id='77').count(), 1)
        self.assertFalse(
            hasattr(ContentItem.objects.get(external_id='77'), 'movie_detail'),
        )

    def test_accepts_homepage_identity_batch_for_thirty_items_per_type(self):
        request_data = {
            'items': [
                {
                    'source_api': source_api,
                    'external_id': f'{content_type.lower()}-{index}',
                    'content_type': content_type,
                }
                for source_api, content_type in [
                    (ContentItem.SourceAPI.TMDB, ContentItem.ContentType.MOVIE),
                    (ContentItem.SourceAPI.TMDB, ContentItem.ContentType.TV_SHOW),
                    (ContentItem.SourceAPI.IGDB, ContentItem.ContentType.GAME),
                    (ContentItem.SourceAPI.SPOTIFY, ContentItem.ContentType.ALBUM),
                    (
                        ContentItem.SourceAPI.OPENLIBRARY,
                        ContentItem.ContentType.BOOK,
                    ),
                ]
                for index in range(30)
            ],
        }
        response = self.client.post(self.url, request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 150)

    def test_rejects_more_than_two_hundred_items(self):
        request_data = {
            'items': [
                {
                    'source_api': ContentItem.SourceAPI.TMDB,
                    'external_id': str(index),
                    'content_type': ContentItem.ContentType.MOVIE,
                }
                for index in range(201)
            ],
        }
        response = self.client.post(self.url, request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_invalid_provider_content_type_pair(self):
        response = self.client.post(
            self.url,
            {
                'items': [{
                    'source_api': ContentItem.SourceAPI.TMDB,
                    'external_id': 'game-1',
                    'content_type': ContentItem.ContentType.GAME,
                }],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_anonymous_browser_requests(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            self.url,
            {
                'items': [{
                    'source_api': ContentItem.SourceAPI.TMDB,
                    'external_id': '78',
                    'content_type': ContentItem.ContentType.MOVIE,
                }],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(PROXY_API_KEY='catalog-service-key')
    def test_accepts_trusted_web_catalog_service(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            self.url,
            {
                'items': [{
                    'source_api': ContentItem.SourceAPI.TMDB,
                    'external_id': '79',
                    'content_type': ContentItem.ContentType.MOVIE,
                }],
            },
            format='json',
            HTTP_X_API_KEY='catalog-service-key',
            HTTP_X_API_CONSUMER='web',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['external_id'], '79')


class ContentItemConcurrentIdentityTests(TransactionTestCase):
    reset_sequences = True

    def test_unique_constraint_deduplicates_concurrent_candidates(self):
        def resolve_candidate():
            close_old_connections()
            try:
                for attempt in range(5):
                    try:
                        ContentItem.objects.bulk_create(
                            [ContentItem(
                                source_api=ContentItem.SourceAPI.TMDB,
                                external_id='concurrent-1',
                                content_type=ContentItem.ContentType.MOVIE,
                            )],
                            ignore_conflicts=True,
                        )
                        return ContentItem.objects.get(
                            source_api=ContentItem.SourceAPI.TMDB,
                            external_id='concurrent-1',
                            content_type=ContentItem.ContentType.MOVIE,
                        ).id
                    except OperationalError as exc:
                        is_transient_sqlite_lock = (
                            connection.vendor == 'sqlite'
                            and 'locked' in str(exc).lower()
                        )
                        if not is_transient_sqlite_lock or attempt == 4:
                            raise
                        close_old_connections()
                        sleep(0.05 * (attempt + 1))
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            ids = list(executor.map(lambda _: resolve_candidate(), range(2)))

        self.assertEqual(ids[0], ids[1])
        self.assertEqual(
            ContentItem.objects.filter(external_id='concurrent-1').count(),
            1,
        )


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
