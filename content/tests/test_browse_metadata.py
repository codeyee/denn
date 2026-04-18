"""
Tests for the browse metadata mapper and upsert flow (Sprint 4.5B).
"""
from datetime import date

from django.test import TestCase

from content.models import ContentItem, ContentItemBrowseMetadata
from content.services.browse_metadata_service import (
    build_browse_metadata,
    upsert_browse_metadata,
)


class BrowseMetadataMapperTests(TestCase):
    """Payloads here mirror the proxy's normalized shape (not the raw upstream APIs)."""

    def test_movie_payload(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='77',
            content_type=ContentItem.ContentType.MOVIE,
        )
        fields = build_browse_metadata(item, {
            'id': '77',
            'type': 'movie',
            'title': 'Memento',
            'original_title': 'Memento',
            'release_date': '2000-10-11',
        })
        self.assertIsNotNone(fields)
        self.assertEqual(fields.display_title, 'Memento')
        self.assertEqual(fields.release_date, date(2000, 10, 11))

    def test_tv_show_payload(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='85937',
            content_type=ContentItem.ContentType.TV_SHOW,
        )
        fields = build_browse_metadata(item, {
            'id': '85937',
            'type': 'tv_show',
            'title': 'Demon Slayer: Kimetsu no Yaiba',
            'release_date': '2019-04-06',
        })
        self.assertEqual(fields.display_title, 'Demon Slayer: Kimetsu no Yaiba')
        self.assertEqual(fields.release_date, date(2019, 4, 6))

    def test_season_payload_uses_release_date_and_falls_back_to_show_title(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='85937:1',
            content_type=ContentItem.ContentType.SEASON,
        )
        # Some season payloads carry both `title` and `tv_show_name`.
        fields = build_browse_metadata(item, {
            'id': '116882',
            'type': 'season',
            'season_number': 1,
            'title': 'Demon Slayer: Kimetsu no Yaiba',
            'tv_show_name': 'Demon Slayer: Kimetsu no Yaiba',
            'release_date': '2019-04-06',
        })
        self.assertEqual(fields.display_title, 'Demon Slayer: Kimetsu no Yaiba')
        self.assertEqual(fields.release_date, date(2019, 4, 6))

    def test_album_payload_picks_artist_authors_only(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.SPOTIFY,
            external_id='2X6WyzpxY70eUn3lnewB7d',
            content_type=ContentItem.ContentType.ALBUM,
        )
        fields = build_browse_metadata(item, {
            'id': '2X6WyzpxY70eUn3lnewB7d',
            'type': 'album',
            'title': 'DATA',
            'release_date': '2023-06-29',
            # `authors[]` mixes types (artist, producer, etc.) — only
            # `type == 'artist'` should land in `artist`.
            'authors': [
                {'name': 'Tainy', 'type': 'artist'},
                {'name': 'Sony Music', 'type': 'producer'},
            ],
        })
        self.assertEqual(fields.artist, 'Tainy')
        self.assertEqual(fields.album_title, 'DATA')
        self.assertEqual(fields.display_title, 'DATA')
        self.assertEqual(fields.release_date, date(2023, 6, 29))

    def test_album_with_multiple_artists_joins_them(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.SPOTIFY,
            external_id='multi',
            content_type=ContentItem.ContentType.ALBUM,
        )
        fields = build_browse_metadata(item, {
            'title': 'Collab',
            'release_date': '2020-01-01',
            'authors': [
                {'name': 'A', 'type': 'artist'},
                {'name': 'B', 'type': 'artist'},
            ],
        })
        self.assertEqual(fields.artist, 'A, B')

    def test_album_with_year_only_release_date(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.SPOTIFY,
            external_id='year-only',
            content_type=ContentItem.ContentType.ALBUM,
        )
        fields = build_browse_metadata(item, {
            'title': 'Ancient',
            'authors': [{'name': 'Foo', 'type': 'artist'}],
            'release_date': '1973',
        })
        self.assertEqual(fields.release_date, date(1973, 1, 1))

    def test_game_payload(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.IGDB,
            external_id='25076',
            content_type=ContentItem.ContentType.GAME,
        )
        fields = build_browse_metadata(item, {
            'id': '25076',
            'type': 'game',
            'title': 'Red Dead Redemption 2',
            'release_date': '2018-10-26',
            'authors': [{'name': 'Rockstar Games', 'type': 'developer'}],
        })
        self.assertEqual(fields.display_title, 'Red Dead Redemption 2')
        self.assertEqual(fields.release_date, date(2018, 10, 26))
        # `artist` stays empty — developers are not artists.
        self.assertEqual(fields.artist, '')

    def test_book_payload(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.OPENLIBRARY,
            external_id='OL16813053W',
            content_type=ContentItem.ContentType.BOOK,
        )
        fields = build_browse_metadata(item, {
            'id': 'OL16813053W',
            'type': 'book',
            'title': 'Words of Radiance',
            'release_date': '2012',
            'authors': [{'name': 'Brandon Sanderson', 'type': 'author'}],
        })
        self.assertEqual(fields.display_title, 'Words of Radiance')
        self.assertEqual(fields.release_date, date(2012, 1, 1))

    def test_empty_payload_returns_none(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='x',
            content_type=ContentItem.ContentType.MOVIE,
        )
        self.assertIsNone(build_browse_metadata(item, {}))


class UpsertBrowseMetadataTests(TestCase):
    def test_upsert_creates_then_updates(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.SPOTIFY,
            external_id='abc',
            content_type=ContentItem.ContentType.ALBUM,
        )
        meta = upsert_browse_metadata(item, {
            'title': 'A',
            'authors': [{'name': 'X', 'type': 'artist'}],
            'release_date': '2020-01-01',
        })
        self.assertIsNotNone(meta)
        self.assertEqual(meta.artist, 'X')

        meta2 = upsert_browse_metadata(item, {
            'title': 'B',
            'authors': [{'name': 'Y', 'type': 'artist'}],
            'release_date': '2021-02-02',
        })
        self.assertEqual(meta2.id, meta.id)
        self.assertEqual(ContentItemBrowseMetadata.objects.count(), 1)
        self.assertEqual(meta2.artist, 'Y')
        self.assertEqual(meta2.display_title, 'B')

    def test_upsert_with_garbage_payload_is_safe(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='x',
            content_type=ContentItem.ContentType.MOVIE,
        )
        self.assertIsNone(upsert_browse_metadata(item, None))  # type: ignore[arg-type]
        self.assertIsNone(upsert_browse_metadata(item, {}))
