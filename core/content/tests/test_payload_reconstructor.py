"""Reconstructor golden-equivalence tests (Sprint 07 / PR-7B).

For each content type we map a fixture into local rows, then reconstruct
the proxy payload and compare against the original. We tolerate the
fixture having extra keys we don't model (e.g. nested `seasons` summary
on tv_show payloads) but the keys we do model must round-trip exactly.
"""
from __future__ import annotations

from django.test import TestCase

from content.models import ContentItem, GameDurationEstimate
from content.services import payload_reconstructor
from content.services.local_content_store import (
    ensure_content_detail,
    get_or_create_content_item,
)
from content.tests.fixtures.payloads import (
    ALBUM_DATA,
    BOOK_WORDS_OF_RADIANCE,
    GAME_RDR2,
    MOVIE_MEMENTO,
    SEASON_DEMON_SLAYER_S01,
    TV_DEMON_SLAYER,
)


def _ingest(source_api: str, external_id: str, content_type: str, payload: dict, country='US'):
    item, _ = get_or_create_content_item(source_api, external_id, content_type)
    ensure_content_detail(item, payload=payload, request_country=country)
    return item


def _modeled_subset(payload: dict, keys: tuple) -> dict:
    return {k: payload[k] for k in keys if k in payload}


class MovieReconstructorTests(TestCase):
    def test_round_trip_movie(self):
        item = _ingest(ContentItem.SourceAPI.TMDB, '77', ContentItem.ContentType.MOVIE, MOVIE_MEMENTO)
        rebuilt = payload_reconstructor.from_local(item)
        self.assertIsNotNone(rebuilt)

        for key in (
            'id', 'type', 'imdb_id', 'title', 'original_title', 'tagline',
            'description', 'image_url', 'release_date', 'status',
            'duration_minutes',
        ):
            self.assertEqual(rebuilt.get(key), MOVIE_MEMENTO.get(key), msg=f'mismatch on {key}')

        self.assertEqual(len(rebuilt.get('images', [])), len(MOVIE_MEMENTO['images']))
        for orig, got in zip(MOVIE_MEMENTO['images'], rebuilt['images']):
            self.assertEqual(orig['type'], got['type'])
            self.assertEqual(orig['size'], got['size'])
            self.assertEqual(orig['image_url'], got['image_url'])

        self.assertEqual(set(rebuilt['platforms'].keys()), set(MOVIE_MEMENTO['platforms'].keys()))

    def test_no_proxy_call_for_fresh(self):
        item = _ingest(ContentItem.SourceAPI.TMDB, '77', ContentItem.ContentType.MOVIE, MOVIE_MEMENTO)
        from unittest.mock import patch
        with patch('content.utils._get_proxy_client') as mocked:
            from content.services.source_data_orchestrator import fetch_bulk_source_data
            results = fetch_bulk_source_data([item])
            self.assertIn(item.id, results)
            mocked.assert_not_called()


class TvShowReconstructorTests(TestCase):
    def test_round_trip_tv(self):
        item = _ingest(ContentItem.SourceAPI.TMDB, '85937', ContentItem.ContentType.TV_SHOW, TV_DEMON_SLAYER)
        rebuilt = payload_reconstructor.from_local(item)
        self.assertEqual(rebuilt['title'], TV_DEMON_SLAYER['title'])
        self.assertEqual(rebuilt['number_of_seasons'], TV_DEMON_SLAYER['number_of_seasons'])
        self.assertEqual(rebuilt['release_date'], TV_DEMON_SLAYER['release_date'])
        self.assertIn('platforms', rebuilt)
        self.assertEqual(len(rebuilt["seasons"]), 1)
        self.assertIsInstance(rebuilt["seasons"][0]["denn_id"], int)
        self.assertEqual(rebuilt["seasons"][0]["season_number"], 1)


class SeasonReconstructorTests(TestCase):
    def test_round_trip_season(self):
        item = _ingest(
            ContentItem.SourceAPI.TMDB, '85937:1', ContentItem.ContentType.SEASON,
            SEASON_DEMON_SLAYER_S01,
        )
        rebuilt = payload_reconstructor.from_local(item)
        self.assertEqual(rebuilt['season_number'], 1)
        self.assertEqual(len(rebuilt['episodes']), 26)
        self.assertEqual(rebuilt['episodes'][0]['title'], 'Cruelty')


class AlbumReconstructorTests(TestCase):
    def test_round_trip_album(self):
        item = _ingest(
            ContentItem.SourceAPI.SPOTIFY, '2X6WyzpxY70eUn3lnewB7d',
            ContentItem.ContentType.ALBUM, ALBUM_DATA, country=None,
        )
        rebuilt = payload_reconstructor.from_local(item)
        self.assertEqual(rebuilt['title'], 'DATA')
        self.assertEqual(rebuilt['album_type'], 'album')
        self.assertEqual(len(rebuilt['tracks']), 2)
        self.assertEqual(rebuilt['tracks'][1]['authors'][1]['name'], 'Bad Bunny')


class GameReconstructorTests(TestCase):
    def test_round_trip_game(self):
        item = _ingest(
            ContentItem.SourceAPI.IGDB, '25076', ContentItem.ContentType.GAME, GAME_RDR2,
            country=None,
        )
        rebuilt = payload_reconstructor.from_local(item)
        self.assertEqual(rebuilt['title'], 'Red Dead Redemption 2')
        self.assertEqual(set(rebuilt['genres']), set(GAME_RDR2['genres']))
        self.assertEqual(rebuilt['play_time'], GAME_RDR2['play_time'])
        self.assertEqual(rebuilt['duration']['status'], 'matched')
        self.assertEqual(rebuilt['duration']['hastily_seconds'], 180000)
        self.assertIn('updated_at', rebuilt['duration'])
        self.assertEqual(len(rebuilt['platforms']), 3)

    def test_reconstructor_sanitizes_existing_bad_duration(self):
        item = _ingest(
            ContentItem.SourceAPI.IGDB, '25076', ContentItem.ContentType.GAME, GAME_RDR2,
        )
        estimate = GameDurationEstimate.objects.get(content_item=item)
        estimate.hastily_seconds = 100 * 60 * 60
        estimate.normally_seconds = 50 * 60 * 60
        estimate.completely_seconds = 3001 * 60 * 60
        estimate.save(update_fields=[
            'hastily_seconds', 'normally_seconds', 'completely_seconds',
        ])

        rebuilt = payload_reconstructor.from_local(item)

        self.assertEqual(rebuilt['duration']['status'], 'matched')
        self.assertNotIn('hastily_seconds', rebuilt['duration'])
        self.assertEqual(rebuilt['duration']['normally_seconds'], 50 * 60 * 60)
        self.assertNotIn('completely_seconds', rebuilt['duration'])


class BookReconstructorTests(TestCase):
    def test_round_trip_book(self):
        item = _ingest(
            ContentItem.SourceAPI.OPENLIBRARY, 'OL16813053W',
            ContentItem.ContentType.BOOK, BOOK_WORDS_OF_RADIANCE, country=None,
        )
        rebuilt = payload_reconstructor.from_local(item)
        self.assertEqual(rebuilt['title'], 'Words of Radiance')
        self.assertEqual(rebuilt['pages'], 1088)
        self.assertEqual(rebuilt['authors'][0]['name'], 'Brandon Sanderson')
