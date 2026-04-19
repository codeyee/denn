"""Golden-mapper tests for `local_content_store` (Sprint 07 / PR-7A).

For each content type we feed a real-world payload fixture into
`ensure_content_detail` and assert that the local Detail row + child
tables hold what we expect. These fixtures are reused by the PR-7B
reconstructor tests so any drift is caught here first.
"""
from __future__ import annotations

from django.test import TestCase

from content.models import (
    AlbumDetail,
    BookDetail,
    ContentItem,
    ContentItemAuthor,
    Episode,
    GameDetail,
    GamePlatform,
    Image,
    MovieDetail,
    SeasonDetail,
    StreamingPlatform,
    Track,
    TrackAuthor,
    TvShowDetail,
)
from content.services.local_content_store import (
    detail_for,
    detail_is_fresh,
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


class GetOrCreateContentItemTests(TestCase):
    def test_creates_then_returns_existing(self):
        item, created = get_or_create_content_item(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='77',
            content_type=ContentItem.ContentType.MOVIE,
        )
        self.assertTrue(created)

        item2, created2 = get_or_create_content_item(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='77',
            content_type=ContentItem.ContentType.MOVIE,
        )
        self.assertFalse(created2)
        self.assertEqual(item.id, item2.id)


class MovieMapperTests(TestCase):
    def setUp(self):
        self.item, _ = get_or_create_content_item(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='77',
            content_type=ContentItem.ContentType.MOVIE,
        )

    def test_upsert_persists_detail_and_children(self):
        ran = ensure_content_detail(self.item, payload=MOVIE_MEMENTO, request_country='US')
        self.assertTrue(ran)

        detail = MovieDetail.objects.get(content_item=self.item)
        self.assertEqual(detail.title, 'Memento')
        self.assertEqual(detail.duration_minutes, 113)
        self.assertEqual(detail.imdb_id, 'tt0209144')
        self.assertTrue(detail.source_payload_hash)

        images = list(Image.objects.filter(content_item=self.item).order_by('position'))
        self.assertEqual(len(images), 3)
        self.assertEqual(images[0].position, 0)
        self.assertEqual(images[2].type, Image.Type.GALLERY)

        platforms = StreamingPlatform.objects.filter(content_item=self.item)
        self.assertEqual(platforms.count(), 2)
        self.assertTrue(platforms.filter(kind='stream', name='Netflix', country_code='US').exists())
        self.assertTrue(platforms.filter(kind='rent', name='Amazon Video').exists())

        roles = list(
            ContentItemAuthor.objects.filter(content_item=self.item).values_list('role', flat=True)
        )
        self.assertEqual(roles, ['producer', 'producer'])

    def test_idempotent_second_call(self):
        ensure_content_detail(self.item, payload=MOVIE_MEMENTO, request_country='US')
        ensure_content_detail(self.item, payload=MOVIE_MEMENTO, request_country='US', force=True)

        self.assertEqual(MovieDetail.objects.filter(content_item=self.item).count(), 1)
        self.assertEqual(Image.objects.filter(content_item=self.item).count(), 3)
        self.assertEqual(
            StreamingPlatform.objects.filter(content_item=self.item, country_code='US').count(),
            2,
        )

    def test_fresh_detail_is_not_re_run(self):
        ran = ensure_content_detail(self.item, payload=MOVIE_MEMENTO)
        self.assertTrue(ran)
        self.assertTrue(detail_is_fresh(self.item))

        ran_again = ensure_content_detail(self.item, payload=MOVIE_MEMENTO)
        self.assertFalse(ran_again)


class TvShowMapperTests(TestCase):
    def test_basic_persist(self):
        item, _ = get_or_create_content_item(
            ContentItem.SourceAPI.TMDB, '85937', ContentItem.ContentType.TV_SHOW,
        )
        ran = ensure_content_detail(item, payload=TV_DEMON_SLAYER, request_country='US')
        self.assertTrue(ran)
        detail = TvShowDetail.objects.get(content_item=item)
        self.assertEqual(detail.title, 'Demon Slayer: Kimetsu no Yaiba')
        self.assertEqual(detail.number_of_seasons, 5)


class SeasonMapperTests(TestCase):
    def test_episodes_and_count(self):
        item, _ = get_or_create_content_item(
            ContentItem.SourceAPI.TMDB, '85937:1', ContentItem.ContentType.SEASON,
        )
        ran = ensure_content_detail(item, payload=SEASON_DEMON_SLAYER_S01, request_country='US')
        self.assertTrue(ran)
        season = SeasonDetail.objects.get(content_item=item)
        self.assertEqual(season.season_number, 1)
        episodes = list(Episode.objects.filter(season_detail=season).order_by('episode_number'))
        self.assertEqual(len(episodes), 26)
        self.assertEqual(episodes[0].title, 'Cruelty')
        self.assertEqual(episodes[-1].episode_number, 26)
        self.assertEqual(season.number_of_episodes, 26)


class AlbumMapperTests(TestCase):
    def test_tracks_with_per_track_authors(self):
        item, _ = get_or_create_content_item(
            ContentItem.SourceAPI.SPOTIFY, '2X6WyzpxY70eUn3lnewB7d', ContentItem.ContentType.ALBUM,
        )
        ran = ensure_content_detail(item, payload=ALBUM_DATA)
        self.assertTrue(ran)

        album = AlbumDetail.objects.get(content_item=item)
        self.assertEqual(album.title, 'DATA')
        self.assertEqual(album.album_type, 'album')
        self.assertEqual(album.total_tracks, 19)

        tracks = list(Track.objects.filter(album_detail=album).order_by('track_number'))
        self.assertEqual(len(tracks), 2)

        tr2_authors = TrackAuthor.objects.filter(track=tracks[1])
        self.assertEqual(tr2_authors.count(), 2)


class GameMapperTests(TestCase):
    def test_taxonomies_and_platforms(self):
        item, _ = get_or_create_content_item(
            ContentItem.SourceAPI.IGDB, '25076', ContentItem.ContentType.GAME,
        )
        ran = ensure_content_detail(item, payload=GAME_RDR2)
        self.assertTrue(ran)

        game = GameDetail.objects.get(content_item=item)
        self.assertEqual(game.title, 'Red Dead Redemption 2')
        self.assertEqual(game.series, 'Red Dead')
        self.assertEqual(game.play_time_min, 50)
        self.assertEqual(game.play_time_max, 200)

        self.assertEqual(GamePlatform.objects.filter(game_detail=game).count(), 3)
        self.assertEqual(game.genres.count(), 2)
        self.assertEqual(game.themes.count(), 2)
        self.assertEqual(game.game_modes.count(), 2)


class BookMapperTests(TestCase):
    def test_persists_book(self):
        item, _ = get_or_create_content_item(
            ContentItem.SourceAPI.OPENLIBRARY, 'OL16813053W', ContentItem.ContentType.BOOK,
        )
        ran = ensure_content_detail(item, payload=BOOK_WORDS_OF_RADIANCE)
        self.assertTrue(ran)
        detail = BookDetail.objects.get(content_item=item)
        self.assertEqual(detail.title, 'Words of Radiance')
        self.assertEqual(detail.pages, 1088)


class DetailHelpersTests(TestCase):
    def test_detail_for_returns_none_when_missing(self):
        item, _ = get_or_create_content_item(
            ContentItem.SourceAPI.TMDB, '999', ContentItem.ContentType.MOVIE,
        )
        self.assertIsNone(detail_for(item))
        self.assertFalse(detail_is_fresh(item))

    def test_ensure_content_detail_handles_garbage_payload(self):
        item, _ = get_or_create_content_item(
            ContentItem.SourceAPI.TMDB, '999', ContentItem.ContentType.MOVIE,
        )
        self.assertFalse(ensure_content_detail(item, payload={}))
        self.assertFalse(ensure_content_detail(item, payload={'foo': 'bar'}))


class AuthorCaseCollisionRegressionTests(TestCase):
    """Regression: payloads bringing the same Author with different casing
    used to crash with IntegrityError on `content_author_slug_key` because
    `_get_or_create_author` looked up by `name` instead of `slug`."""

    def test_two_payloads_same_author_different_casing(self):
        from content.models import Author
        item_a, _ = get_or_create_content_item(
            ContentItem.SourceAPI.IGDB, 'a', ContentItem.ContentType.GAME,
        )
        item_b, _ = get_or_create_content_item(
            ContentItem.SourceAPI.IGDB, 'b', ContentItem.ContentType.GAME,
        )

        payload_a = {'id': 'a', 'title': 'Game A', 'authors': [{'name': 'CD Projekt Red'}]}
        payload_b = {'id': 'b', 'title': 'Game B', 'authors': [{'name': 'CD PROJEKT RED'}]}

        self.assertTrue(ensure_content_detail(item_a, payload=payload_a))
        self.assertTrue(ensure_content_detail(item_b, payload=payload_b))

        self.assertEqual(Author.objects.filter(slug='cd-projekt-red').count(), 1)
        self.assertEqual(
            ContentItemAuthor.objects.filter(content_item=item_a).count(), 1
        )
        self.assertEqual(
            ContentItemAuthor.objects.filter(content_item=item_b).count(), 1
        )
