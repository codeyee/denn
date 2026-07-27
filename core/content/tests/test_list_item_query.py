"""
Tests for the list-item query model (filters, sort, group_by) introduced in Sprint 4.5A.
"""
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from content.models import ContentItem, ListItem, UserList
from content.services import (
    QueryParseError,
    SortClause,
    apply_query,
    parse_list_item_query,
)


class ParseListItemQueryTests(APITestCase):
    def _params(self, **kwargs):
        from django.http import QueryDict
        qd = QueryDict(mutable=True)
        for k, v in kwargs.items():
            qd[k] = v
        return qd

    def test_empty_query(self):
        q = parse_list_item_query(self._params())
        self.assertEqual(q.filters, {})
        self.assertEqual(q.sort, [])
        self.assertIsNone(q.group_by)

    def test_filter_single(self):
        q = parse_list_item_query(
            self._params(**{'filter[context_status]': 'COMPLETED'})
        )
        self.assertEqual(q.filters, {'context_status': 'COMPLETED'})

    def test_filter_csv(self):
        q = parse_list_item_query(self._params(**{'filter[content_type]': 'ALBUM,MOVIE'}))
        self.assertEqual(q.filters, {'content_item__content_type__in': ['ALBUM', 'MOVIE']})

    def test_filter_unknown_field_raises(self):
        with self.assertRaises(QueryParseError):
            parse_list_item_query(self._params(**{'filter[wat]': 'x'}))

    def test_sort_single_asc(self):
        q = parse_list_item_query(self._params(sort='added_at'))
        self.assertEqual(len(q.sort), 1)
        self.assertEqual(q.sort[0], SortClause('added_at', 'asc'))

    def test_sort_multi_with_desc(self):
        q = parse_list_item_query(self._params(sort='artist,-release_date,list_order'))
        self.assertEqual(
            [(c.field, c.direction) for c in q.sort],
            [('artist', 'asc'), ('release_date', 'desc'), ('list_order', 'asc')],
        )

    def test_sort_unknown_field_raises(self):
        with self.assertRaises(QueryParseError):
            parse_list_item_query(self._params(sort='foo'))

    def test_group_by_valid(self):
        q = parse_list_item_query(self._params(group_by='context_status'))
        self.assertEqual(q.group_by, 'context_status')

    def test_group_by_unknown_raises(self):
        with self.assertRaises(QueryParseError):
            parse_list_item_query(self._params(group_by='wat'))

    def test_range_filter_added_at(self):
        q = parse_list_item_query(self._params(**{'filter[added_at_gte]': '2024-01-01'}))
        self.assertEqual(q.range_filters, {'added_at__gte': '2024-01-01'})

    def test_range_filter_list_rating_coerces_float(self):
        q = parse_list_item_query(self._params(**{'filter[list_rating_gte]': '3.5'}))
        self.assertEqual(q.range_filters, {'member_rating_avg_annotated__gte': 3.5})


class ListItemEndpointQueryTests(APITestCase):
    """End-to-end tests of GET /lists/<pk>/items/ using the new query model."""

    def setUp(self):
        self.user = User.objects.create_user(username='alice', password='x')
        self.client.force_authenticate(user=self.user)

        self.lst = UserList.objects.create(
            name='Mixed', owner=self.user, list_type=UserList.ListType.SHARED,
        )

        self.movie = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='100', content_type=ContentItem.ContentType.MOVIE,
        )
        self.album = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.SPOTIFY,
            external_id='abc', content_type=ContentItem.ContentType.ALBUM,
        )
        self.book = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.OPENLIBRARY,
            external_id='OL1', content_type=ContentItem.ContentType.BOOK,
        )

        self.li_movie = ListItem.objects.create(
            user_list=self.lst, content_item=self.movie, added_by=self.user, list_order=1,
            context_status=ListItem.Status.COMPLETED,
        )
        self.li_album = ListItem.objects.create(
            user_list=self.lst, content_item=self.album, added_by=self.user, list_order=2,
            context_status=ListItem.Status.PENDING,
        )
        self.li_book = ListItem.objects.create(
            user_list=self.lst, content_item=self.book, added_by=self.user, list_order=3,
            context_status=ListItem.Status.PENDING,
        )

    def _items_url(self):
        return reverse('content:lists:items-list', kwargs={'list_pk': self.lst.id})

    def test_filter_context_status_completed(self):
        response = self.client.get(
            self._items_url(),
            {'filter[context_status]': 'COMPLETED'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in response.data['results']]
        self.assertEqual(ids, [self.li_movie.id])

    def test_filter_content_type_csv(self):
        response = self.client.get(self._items_url(), {'filter[content_type]': 'ALBUM,BOOK'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = sorted(item['id'] for item in response.data['results'])
        self.assertEqual(ids, sorted([self.li_album.id, self.li_book.id]))

    def test_sort_by_content_type_desc(self):
        response = self.client.get(self._items_url(), {'sort': '-content_type'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        types = [item['content_item']['content_type'] for item in response.data['results']]
        # Reverse-alphabetical: MOVIE > BOOK > ALBUM
        self.assertEqual(types, ['MOVIE', 'BOOK', 'ALBUM'])

    def test_unknown_sort_returns_400(self):
        response = self.client.get(self._items_url(), {'sort': 'totally_made_up'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Unknown sort field', response.data['detail'])

    def test_group_by_emits_group_metadata(self):
        response = self.client.get(
            self._items_url(),
            {'group_by': 'context_status'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        groups = response.data['metadata'].get('groups')
        self.assertIsNotNone(groups, 'Expected `groups` metadata when group_by is active')
        labels = {g['key']: g for g in groups}
        self.assertIn('PENDING', labels)
        self.assertIn('COMPLETED', labels)
        self.assertEqual(labels['COMPLETED']['count_global'], 1)
        self.assertEqual(labels['PENDING']['count_global'], 2)

    def test_sort_by_artist_uses_browse_metadata(self):
        """Sort fields backed by browse metadata work end-to-end after upserting it."""
        from content.models import ContentItemBrowseMetadata

        # Create three album list items with different artists.
        lst = UserList.objects.create(
            name='Albums', owner=self.user, list_type=UserList.ListType.PERSONAL,
        )
        albums = []
        for ext, artist in [('a1', 'Daft Punk'), ('a2', 'Beatles'), ('a3', 'Zappa')]:
            ci = ContentItem.objects.create(
                source_api=ContentItem.SourceAPI.SPOTIFY,
                external_id=ext,
                content_type=ContentItem.ContentType.ALBUM,
            )
            ContentItemBrowseMetadata.objects.create(
                content_item=ci, display_title=ext, artist=artist, album_title=ext,
            )
            li = ListItem.objects.create(
                user_list=lst, content_item=ci, added_by=self.user, list_order=len(albums) + 1,
            )
            albums.append((artist, li.id))

        url = reverse('content:lists:items-list', kwargs={'list_pk': lst.id})
        response = self.client.get(url, {'sort': 'artist'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in response.data['results']]
        expected = [li_id for _, li_id in sorted(albums, key=lambda t: t[0])]
        self.assertEqual(ids, expected)

    def test_pagination_remains_global_with_grouping(self):
        response = self.client.get(self._items_url(), {
            'group_by': 'context_status', 'page_size': 2, 'page': 1,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['metadata']['count'], 3)
        self.assertEqual(response.data['metadata']['total_pages'], 2)
        self.assertEqual(len(response.data['results']), 2)


class ApplySortAsListOrderTests(APITestCase):
    """POST /lists/<pk>/items/apply-sort/ promotes a sort to canonical order."""

    def setUp(self):
        self.user = User.objects.create_user(username='alice', password='x')
        self.client.force_authenticate(user=self.user)
        self.lst = UserList.objects.create(
            name='Mix', owner=self.user, list_type=UserList.ListType.PERSONAL,
        )
        self.items = []
        for idx, (ext, ctype) in enumerate(
            [('m1', ContentItem.ContentType.MOVIE),
             ('a1', ContentItem.ContentType.ALBUM),
             ('b1', ContentItem.ContentType.BOOK)],
            start=1,
        ):
            ci = ContentItem.objects.create(
                source_api=ContentItem.SourceAPI.TMDB,
                external_id=ext, content_type=ctype,
            )
            self.items.append(ListItem.objects.create(
                user_list=self.lst, content_item=ci,
                added_by=self.user, list_order=idx,
            ))

    def _url(self):
        return reverse('content:lists:items-apply-sort', kwargs={'list_pk': self.lst.id})

    def test_promotes_sort_to_canonical_order(self):
        response = self.client.post(self._url(), {'sort': 'content_type'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['updated'], 3)

        ordered = list(
            ListItem.objects.filter(user_list=self.lst).order_by('list_order')
            .values_list('content_item__content_type', flat=True)
        )
        self.assertEqual(ordered, sorted(ordered))

    def test_rejects_when_filters_present(self):
        response = self.client.post(
            self._url() + '?filter[context_status]=PENDING',
            {'sort': 'content_type'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_when_grouping_present(self):
        response = self.client.post(
            self._url() + '?group_by=context_status',
            {'sort': 'content_type'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_empty_sort(self):
        response = self.client.post(self._url(), {'sort': ''}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_noop_list_order_sort(self):
        response = self.client.post(self._url(), {'sort': 'list_order'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
