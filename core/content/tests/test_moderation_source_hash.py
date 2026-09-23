from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from content.models import ContentItem, ContentModerationJudgment, MovieDetail, SeasonDetail
from content.moderation.summary import moderation_summary
from content.services.local_content_store import ensure_content_detail
from content.services.local_content_store.mappers import MAPPERS
from content.services.moderation_service import build_state_and_hash
from content.services.moderation_source_hash import current_moderation_source_hash
from content.tests.fixtures.payloads import (
    ALBUM_DATA,
    BOOK_WORDS_OF_RADIANCE,
    GAME_RDR2,
    MOVIE_MEMENTO,
    SEASON_DEMON_SLAYER_S01,
    TV_DEMON_SLAYER,
)


class ModerationSourceHashTests(TestCase):
    CASES = (
        (ContentItem.SourceAPI.TMDB, ContentItem.ContentType.MOVIE, MOVIE_MEMENTO),
        (ContentItem.SourceAPI.TMDB, ContentItem.ContentType.TV_SHOW, TV_DEMON_SLAYER),
        (ContentItem.SourceAPI.TMDB, ContentItem.ContentType.SEASON, SEASON_DEMON_SLAYER_S01),
        (ContentItem.SourceAPI.IGDB, ContentItem.ContentType.GAME, GAME_RDR2),
        (ContentItem.SourceAPI.SPOTIFY, ContentItem.ContentType.ALBUM, ALBUM_DATA),
        (ContentItem.SourceAPI.OPENLIBRARY, ContentItem.ContentType.BOOK, BOOK_WORDS_OF_RADIANCE),
    )

    def create_item(self, source_api, content_type, suffix):
        return ContentItem.objects.create(
            source_api=source_api,
            external_id=f"moderation-hash-{content_type}-{suffix}",
            content_type=content_type,
        )

    def test_full_detail_upserts_materialize_same_hash_as_classification_builder(self):
        for index, (source_api, content_type, payload) in enumerate(self.CASES):
            with self.subTest(content_type=content_type):
                item = self.create_item(source_api, content_type, index)
                self.assertTrue(ensure_content_detail(item, payload=payload, force=True))
                expected_hash = build_state_and_hash(item)[1]
                item.refresh_from_db()
                self.assertEqual(item.current_moderation_source_hash, expected_hash)

    def test_unchanged_upsert_preserves_hash_and_changed_text_invalidates_judgment(self):
        item = self.create_item(
            ContentItem.SourceAPI.TMDB,
            ContentItem.ContentType.MOVIE,
            "change",
        )
        ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
        original_hash = item.current_moderation_source_hash
        judgment = ContentModerationJudgment.objects.create(
            content_item=item,
            source_data_hash=original_hash,
            model_name="jev-1.13.0",
            question_revision="q3",
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
        )

        ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
        self.assertEqual(item.current_moderation_source_hash, original_hash)
        self.assertEqual(moderation_summary(item), {"status": "complete", "classification": "safe"})

        changed = {**MOVIE_MEMENTO, "description": "A different moderation-relevant description."}
        ensure_content_detail(item, payload=changed, force=True)
        item.refresh_from_db()
        self.assertNotEqual(item.current_moderation_source_hash, judgment.source_data_hash)
        self.assertEqual(moderation_summary(item), {"status": "stale", "classification": None})

    def test_sparse_detail_uses_the_same_canonical_hash_builder(self):
        item = self.create_item(
            ContentItem.SourceAPI.TMDB,
            ContentItem.ContentType.MOVIE,
            "sparse",
        )
        sparse_payload = {"id": "sparse", "type": "movie", "title": "Minimal title"}
        self.assertTrue(ensure_content_detail(item, payload=sparse_payload, force=True))
        self.assertEqual(item.current_moderation_source_hash, build_state_and_hash(item)[1])

    def test_failed_mapper_rolls_back_detail_and_hash_together(self):
        item = self.create_item(
            ContentItem.SourceAPI.TMDB,
            ContentItem.ContentType.MOVIE,
            "rollback",
        )
        ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
        initial_hash = item.current_moderation_source_hash
        initial_title = MovieDetail.objects.get(content_item=item).title
        original_mapper = MAPPERS[ContentItem.ContentType.MOVIE]

        def fail_after_persist(*args, **kwargs):
            original_mapper(*args, **kwargs)
            raise RuntimeError("simulated mapper failure")

        changed = {**MOVIE_MEMENTO, "title": "Uncommitted title"}
        with patch.dict(
            "content.services.local_content_store.MAPPERS",
            {ContentItem.ContentType.MOVIE: fail_after_persist},
        ):
            self.assertFalse(ensure_content_detail(item, payload=changed, force=True))

        item.refresh_from_db()
        self.assertEqual(item.current_moderation_source_hash, initial_hash)
        self.assertEqual(MovieDetail.objects.get(content_item=item).title, initial_title)

    def test_tv_parent_title_change_invalidates_unincluded_seasons(self):
        tv_payload = {key: value for key, value in TV_DEMON_SLAYER.items() if key != "seasons"}
        show = self.create_item(
            ContentItem.SourceAPI.TMDB,
            ContentItem.ContentType.TV_SHOW,
            "parent",
        )
        ensure_content_detail(show, payload=tv_payload, force=True)

        season_payload = {**SEASON_DEMON_SLAYER_S01}
        season_payload.pop("tv_show_name", None)
        season = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id=f"{show.external_id}:1",
            content_type=ContentItem.ContentType.SEASON,
        )
        ensure_content_detail(season, payload=season_payload, force=True)
        self.assertEqual(SeasonDetail.objects.get(content_item=season).tv_show_id, show.pk)
        old_hash = season.current_moderation_source_hash
        ContentModerationJudgment.objects.create(
            content_item=season,
            source_data_hash=old_hash,
            model_name="jev-1.13.0",
            question_revision="q3",
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
        )

        changed_show = {**tv_payload, "title": "Renamed series"}
        ensure_content_detail(show, payload=changed_show, force=True)
        season.refresh_from_db()
        self.assertIsNotNone(season.current_moderation_source_hash)
        self.assertNotEqual(season.current_moderation_source_hash, old_hash)
        self.assertEqual(moderation_summary(season), {"status": "stale", "classification": None})

        nested_season = {
            **TV_DEMON_SLAYER["seasons"][0],
            "tv_show_name": "Renamed series",
            "title": "Renamed series season one",
        }
        ensure_content_detail(
            show,
            payload={**changed_show, "seasons": [nested_season]},
            force=True,
        )
        season.refresh_from_db()
        self.assertIsNotNone(season.current_moderation_source_hash)
        self.assertNotEqual(season.current_moderation_source_hash, old_hash)
        self.assertEqual(moderation_summary(season), {"status": "stale", "classification": None})

    def test_legacy_null_hash_is_stale_and_bounded_command_can_fill_it(self):
        item = self.create_item(
            ContentItem.SourceAPI.TMDB,
            ContentItem.ContentType.MOVIE,
            "legacy",
        )
        ensure_content_detail(item, payload=MOVIE_MEMENTO, force=True)
        judgment = ContentModerationJudgment.objects.create(
            content_item=item,
            source_data_hash=item.current_moderation_source_hash,
            model_name="jev-1.13.0",
            question_revision="q3",
            status=ContentModerationJudgment.Status.COMPLETE,
            classification=ContentModerationJudgment.Classification.SAFE,
        )
        ContentItem.objects.filter(pk=item.pk).update(current_moderation_source_hash=None)
        item.current_moderation_source_hash = None
        self.assertEqual(moderation_summary(item), {"status": "stale", "classification": None})

        with patch(
            "content.services.moderation_source_hash.current_moderation_source_hash",
            wraps=current_moderation_source_hash,
        ) as hash_builder:
            call_command("backfill_moderation_source_hashes", limit=1, after_id=item.pk - 1)

        item.refresh_from_db()
        self.assertEqual(item.current_moderation_source_hash, judgment.source_data_hash)
        self.assertEqual(moderation_summary(item), {"status": "complete", "classification": "safe"})
        hash_builder.assert_called_once()
