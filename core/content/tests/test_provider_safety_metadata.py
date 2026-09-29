"""Persistence and reconstruction of optional provider safety metadata.

The Proxy adds these fields to detail payloads (see the safety-metadata
contract). Core stores them defensively, lets a refresh that omits a field
clear it, and round-trips them through the payload reconstructor.
"""
from __future__ import annotations

from django.test import TestCase

from content.models import BookDetail, ContentItem, GameDetail, MovieDetail, Track, TvShowDetail
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
    TV_DEMON_SLAYER,
)

MOVIE_SAFETY = {
    'adult': True,
    'genres': ['Drama', 'Romance'],
    'keywords': ['erotic movie', 'softcore'],
    'certifications': [{'country': 'US', 'rating': 'R'}, {'country': 'GB', 'rating': '18'}],
}
GAME_SAFETY = {
    'keywords': ['sex', 'dating sim'],
    'age_ratings': [
        {'organization': 'ESRB', 'rating': 'M', 'descriptors': ['Blood and Gore', 'Nudity']},
        {'organization': 'PEGI', 'rating': '18'},
    ],
}
SAFETY_KEYS = {
    ContentItem.ContentType.MOVIE: ('adult', 'genres', 'keywords', 'certifications'),
    ContentItem.ContentType.TV_SHOW: ('adult', 'genres', 'keywords', 'certifications'),
    ContentItem.ContentType.GAME: ('keywords', 'age_ratings'),
    ContentItem.ContentType.BOOK: ('subjects',),
}


def ingest(source_api, external_id, content_type, payload):
    item, _ = get_or_create_content_item(source_api, external_id, content_type)
    refreshed = ensure_content_detail(item, payload=payload, force=True)
    assert refreshed, 'the detail write must succeed'
    return item


def reconstruct(item):
    # `from_local` reads the reverse one-to-one cache, so start from a fresh instance.
    return payload_reconstructor.from_local(ContentItem.objects.get(pk=item.pk))


def without(payload, *keys):
    return {key: value for key, value in payload.items() if key not in keys}


def tmdb_cases():
    return (
        (ContentItem.ContentType.MOVIE, ContentItem.SourceAPI.TMDB, '77', MOVIE_MEMENTO, MovieDetail),
        (ContentItem.ContentType.TV_SHOW, ContentItem.SourceAPI.TMDB, '85937', TV_DEMON_SLAYER,
         TvShowDetail),
    )


class TmdbSafetyMetadataTests(TestCase):
    def ingest_case(self, content_type, source_api, external_id, fixture, **extra):
        return ingest(source_api, external_id, content_type, {**fixture, **extra})

    def test_movie_and_tv_show_round_trip_every_safety_field(self):
        for content_type, source_api, external_id, fixture, detail_model in tmdb_cases():
            with self.subTest(content_type=content_type):
                item = self.ingest_case(
                    content_type, source_api, external_id, fixture, **MOVIE_SAFETY)

                detail = detail_model.objects.get(content_item=item)
                self.assertIs(detail.adult, True)
                self.assertEqual(detail.genres, MOVIE_SAFETY['genres'])
                self.assertEqual(detail.keywords, MOVIE_SAFETY['keywords'])
                self.assertEqual(detail.certifications, MOVIE_SAFETY['certifications'])

                rebuilt = reconstruct(item)
                for key, value in MOVIE_SAFETY.items():
                    self.assertEqual(rebuilt[key], value, msg=key)

    def test_adult_false_is_kept_and_a_missing_flag_is_unknown(self):
        for content_type, source_api, external_id, fixture, detail_model in tmdb_cases():
            with self.subTest(content_type=content_type):
                item = self.ingest_case(
                    content_type, source_api, external_id, fixture, adult=False)
                self.assertIs(detail_model.objects.get(content_item=item).adult, False)
                self.assertIs(reconstruct(item)['adult'], False)

                ensure_content_detail(item, payload=without(fixture, 'adult'), force=True)
                self.assertIsNone(detail_model.objects.get(content_item=item).adult)
                self.assertNotIn('adult', reconstruct(item))

    def test_payload_without_safety_fields_reconstructs_without_them(self):
        for content_type, source_api, external_id, fixture, detail_model in tmdb_cases():
            with self.subTest(content_type=content_type):
                item = self.ingest_case(content_type, source_api, external_id, fixture)

                detail = detail_model.objects.get(content_item=item)
                self.assertEqual(
                    (detail.adult, detail.genres, detail.keywords, detail.certifications),
                    (None, [], [], []),
                )
                rebuilt = reconstruct(item)
                for key in SAFETY_KEYS[content_type]:
                    self.assertNotIn(key, rebuilt)

    def test_refresh_that_omits_fields_clears_them(self):
        for content_type, source_api, external_id, fixture, detail_model in tmdb_cases():
            with self.subTest(content_type=content_type):
                item = self.ingest_case(
                    content_type, source_api, external_id, fixture, **MOVIE_SAFETY)

                ensure_content_detail(item, payload=fixture, force=True)

                detail = detail_model.objects.get(content_item=item)
                self.assertEqual(
                    (detail.adult, detail.genres, detail.keywords, detail.certifications),
                    (None, [], [], []),
                )

    def test_partial_refresh_replaces_each_field_independently(self):
        item = self.ingest_case(
            ContentItem.ContentType.MOVIE, ContentItem.SourceAPI.TMDB, '77', MOVIE_MEMENTO,
            **MOVIE_SAFETY)

        ensure_content_detail(
            item,
            payload={**MOVIE_MEMENTO, 'adult': False, 'keywords': ['heist']},
            force=True,
        )

        detail = MovieDetail.objects.get(content_item=item)
        self.assertEqual(
            (detail.adult, detail.genres, detail.keywords, detail.certifications),
            (False, [], ['heist'], []),
        )

    def test_malformed_safety_fields_are_dropped_without_failing_the_write(self):
        for content_type, source_api, external_id, fixture, detail_model in tmdb_cases():
            with self.subTest(content_type=content_type):
                item = self.ingest_case(
                    content_type, source_api, external_id, fixture,
                    adult='true',
                    genres='Drama',
                    keywords=[None, 5, {'name': 'x'}, ['nested'], '  softcore  ', 'softcore', ' ', 'kept'],
                    certifications=[
                        {'country': 'US', 'rating': ' R '},
                        {'country': 'US', 'rating': 'R'},
                        {'country': 'US'},
                        {'country': '', 'rating': 'PG'},
                        {'country': 5, 'rating': 'PG'},
                        {'country': 'GB', 'rating': None},
                        'US: R',
                        None,
                        {'country': 'DE', 'rating': '16'},
                    ],
                )

                detail = detail_model.objects.get(content_item=item)
                self.assertIsNone(detail.adult)
                self.assertEqual(detail.genres, [])
                self.assertEqual(detail.keywords, ['softcore', 'kept'])
                self.assertEqual(
                    detail.certifications,
                    [{'country': 'US', 'rating': 'R'}, {'country': 'DE', 'rating': '16'}],
                )

    def test_non_list_containers_and_numeric_flags_become_unknown(self):
        for bad in ({'a': 1}, 'x', 7, True):
            with self.subTest(bad=bad):
                item = self.ingest_case(
                    ContentItem.ContentType.MOVIE, ContentItem.SourceAPI.TMDB, '77',
                    MOVIE_MEMENTO, adult=1, genres=bad, keywords=bad, certifications=bad)

                detail = MovieDetail.objects.get(content_item=item)
                self.assertEqual(
                    (detail.adult, detail.genres, detail.keywords, detail.certifications),
                    (None, [], [], []),
                )

    def test_lists_are_capped(self):
        item = self.ingest_case(
            ContentItem.ContentType.MOVIE, ContentItem.SourceAPI.TMDB, '77', MOVIE_MEMENTO,
            keywords=[f'keyword {number}' for number in range(150)],
            certifications=[{'country': f'C{number}', 'rating': 'R'} for number in range(150)],
        )

        detail = MovieDetail.objects.get(content_item=item)
        self.assertEqual(len(detail.keywords), 100)
        self.assertEqual(detail.keywords[0], 'keyword 0')
        self.assertEqual(detail.keywords[-1], 'keyword 99')
        self.assertEqual(len(detail.certifications), 100)


class GameSafetyMetadataTests(TestCase):
    def ingest_game(self, **extra):
        return ingest(
            ContentItem.SourceAPI.IGDB, '25076', ContentItem.ContentType.GAME,
            {**GAME_RDR2, **extra})

    def test_round_trip_keywords_and_age_ratings(self):
        item = self.ingest_game(**GAME_SAFETY)

        detail = GameDetail.objects.get(content_item=item)
        self.assertEqual(detail.keywords, GAME_SAFETY['keywords'])
        self.assertEqual(detail.age_ratings, [
            {'organization': 'ESRB', 'rating': 'M', 'descriptors': ['Blood and Gore', 'Nudity']},
            {'organization': 'PEGI', 'rating': '18', 'descriptors': []},
        ])
        rebuilt = reconstruct(item)
        self.assertEqual(rebuilt['keywords'], GAME_SAFETY['keywords'])
        self.assertEqual(rebuilt['age_ratings'], GAME_SAFETY['age_ratings'])

    def test_missing_fields_stay_empty_and_refresh_clears_them(self):
        item = self.ingest_game()
        detail = GameDetail.objects.get(content_item=item)
        self.assertEqual((detail.keywords, detail.age_ratings), ([], []))
        rebuilt = reconstruct(item)
        self.assertNotIn('keywords', rebuilt)
        self.assertNotIn('age_ratings', rebuilt)

        self.ingest_game(**GAME_SAFETY)
        self.ingest_game()

        detail.refresh_from_db()
        self.assertEqual((detail.keywords, detail.age_ratings), ([], []))

    def test_malformed_entries_are_dropped_without_failing_the_write(self):
        item = self.ingest_game(
            keywords='sex',
            age_ratings=[
                {'organization': 'ESRB', 'rating': ' AO ', 'descriptors': ['Sexual Content', 5, None, ' ']},
                {'organization': 'ESRB', 'rating': 'AO', 'descriptors': ['Sexual Content']},
                {'organization': 'ESRB'},
                {'rating': 'M'},
                {'organization': '', 'rating': 'M'},
                {'organization': 4, 'rating': 'M'},
                {'organization': 'PEGI', 'rating': '12', 'descriptors': 'Violence'},
                'ESRB M',
                None,
            ],
        )

        detail = GameDetail.objects.get(content_item=item)
        self.assertEqual(detail.keywords, [])
        self.assertEqual(detail.age_ratings, [
            {'organization': 'ESRB', 'rating': 'AO', 'descriptors': ['Sexual Content']},
            {'organization': 'PEGI', 'rating': '12', 'descriptors': []},
        ])

    def test_lists_are_capped(self):
        item = self.ingest_game(
            keywords=[f'keyword {number}' for number in range(150)],
            age_ratings=[
                {'organization': f'ORG{number}', 'rating': 'X'} for number in range(30)
            ],
        )

        detail = GameDetail.objects.get(content_item=item)
        self.assertEqual(len(detail.keywords), 100)
        self.assertEqual(len(detail.age_ratings), 20)


class AlbumTrackExplicitTests(TestCase):
    def tracks(self, flags):
        template = ALBUM_DATA['tracks'][0]
        return [
            {**without(template, 'explicit'), 'id': f'track{number}', 'track_number': number + 1,
             **({} if flag is ... else {'explicit': flag})}
            for number, flag in enumerate(flags)
        ]

    def ingest_album(self, flags):
        return ingest(
            ContentItem.SourceAPI.SPOTIFY, ALBUM_DATA['id'], ContentItem.ContentType.ALBUM,
            {**ALBUM_DATA, 'tracks': self.tracks(flags)})

    def test_track_explicit_flag_round_trips_true_false_and_unknown(self):
        item = self.ingest_album([True, False, ...])

        self.assertEqual(
            list(Track.objects.filter(album_detail__content_item=item).values_list('explicit', flat=True)),
            [True, False, None],
        )
        rebuilt = reconstruct(item)
        self.assertIs(rebuilt['tracks'][0]['explicit'], True)
        self.assertIs(rebuilt['tracks'][1]['explicit'], False)
        self.assertNotIn('explicit', rebuilt['tracks'][2])

    def test_malformed_flags_are_unknown(self):
        item = self.ingest_album(['true', 1, 'yes', None])

        self.assertEqual(
            list(Track.objects.filter(album_detail__content_item=item).values_list('explicit', flat=True)),
            [None, None, None, None],
        )

    def test_refresh_that_omits_the_flag_clears_it(self):
        item = self.ingest_album([True, True])

        self.ingest_album([..., ...])

        self.assertEqual(
            list(Track.objects.filter(album_detail__content_item=item).values_list('explicit', flat=True)),
            [None, None],
        )


class BookSubjectsTests(TestCase):
    def ingest_book(self, **extra):
        return ingest(
            ContentItem.SourceAPI.OPENLIBRARY, BOOK_WORDS_OF_RADIANCE['id'],
            ContentItem.ContentType.BOOK, {**BOOK_WORDS_OF_RADIANCE, **extra})

    def test_subjects_round_trip(self):
        item = self.ingest_book(subjects=['Fiction', 'Erotica'])

        self.assertEqual(BookDetail.objects.get(content_item=item).subjects, ['Fiction', 'Erotica'])
        self.assertEqual(reconstruct(item)['subjects'], ['Fiction', 'Erotica'])

    def test_missing_subjects_are_omitted_and_a_refresh_clears_them(self):
        item = self.ingest_book(subjects=['Fiction'])

        self.ingest_book()

        self.assertEqual(BookDetail.objects.get(content_item=item).subjects, [])
        self.assertNotIn('subjects', reconstruct(item))

    def test_malformed_subjects_are_dropped_and_capped(self):
        item = self.ingest_book(
            subjects=[' Fiction ', 'Fiction', None, 3, {'name': 'x'}, ''] + [f'S{n}' for n in range(80)])

        subjects = BookDetail.objects.get(content_item=item).subjects
        self.assertEqual(len(subjects), 50)
        self.assertEqual(subjects[:2], ['Fiction', 'S0'])

        item = self.ingest_book(subjects={'name': 'Fiction'})
        self.assertEqual(BookDetail.objects.get(content_item=item).subjects, [])
