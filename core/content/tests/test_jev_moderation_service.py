"""Offline tests for the deterministic moderation classification service (JEV-003A)."""
from types import SimpleNamespace
from unittest.mock import patch

from django.db import IntegrityError
from django.test import TestCase, override_settings

from content.models import (
    AlbumDetail,
    BookDetail,
    ContentItem,
    ContentModerationJudgment,
    GameDetail,
    MovieDetail,
    SeasonDetail,
    Track,
    TvShowDetail,
)
from content.services.moderation_service import (
    ModerationClassificationOutcome,
    _provider_explicit,
    build_state_and_hash,
    classify_content_item,
)


ENABLED = {'MODERATION_CLASSIFICATION_ENABLED': True}
DISABLED = {'MODERATION_CLASSIFICATION_ENABLED': False}


class _RecordingClient:
    def __init__(self, response_model='jev-1.13.0', input_tokens=11, output_tokens=3):
        self.calls = []
        self.response_model = response_model
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens

    def classify(self, state):
        self.calls.append(state)
        response_model = self.response_model
        input_tokens = self.input_tokens
        output_tokens = self.output_tokens

        class _Response:
            model = response_model
            nouls = {
                'safe_for_automatic_discovery': 0.9,
                'explicit_or_sensitive': 0.05,
                'needs_review': 0.05,
            }
            usage = type('U', (), {'input_tokens': input_tokens, 'output_tokens': output_tokens})()

        return _Response()


class _NoUsageClient:
    """A client whose response omits the usage object entirely."""

    def __init__(self):
        self.calls = []

    def classify(self, state):
        self.calls.append(state)

        class _Response:
            model = 'jev-1.13.0'
            nouls = {
                'safe_for_automatic_discovery': 0.9,
                'explicit_or_sensitive': 0.05,
                'needs_review': 0.05,
            }
            usage = None

        return _Response()


class _UnavailableClient:
    def classify(self, state):
        from content.moderation.errors import ModerationUnavailable
        raise ModerationUnavailable('typesafe_timeout')


class _UnreachableFactory:
    def __init__(self):
        raise AssertionError('disabled mode must not construct the TypeSafe client')


def _movie_item(**overrides):
    item = ContentItem.objects.create(
        source_api=overrides.pop('source_api', ContentItem.SourceAPI.TMDB),
        external_id=overrides.pop('external_id', '5501'),
        content_type=ContentItem.ContentType.MOVIE,
    )
    MovieDetail.objects.create(
        content_item=item,
        title='Fight Club',
        description='A dystopian drama.',
    )
    return item


class ModerationServiceTests(TestCase):
    """Exhaustive coverage of the JEV-003A service contract."""

    def setUp(self):
        self.client = _RecordingClient()

    def test_state_hash_is_deterministic_for_identical_inputs(self):
        s1, h1 = build_state_and_hash(_movie_item(external_id='5501'))
        s2, h2 = build_state_and_hash(_movie_item(external_id='5502'))
        self.assertEqual((s1, h1), (s2, h2))

    def test_changed_normalized_input_produces_a_different_hash(self):
        item = _movie_item()
        _, original = build_state_and_hash(item)
        item.movie_detail.description = 'Changed description.'
        item.movie_detail.save()
        _, updated = build_state_and_hash(item)
        self.assertNotEqual(original, updated)

    def test_type_specific_movie_tv_and_game_text_changes_the_hash(self):
        cases = (
            (
                ContentItem.ContentType.MOVIE,
                ContentItem.SourceAPI.TMDB,
                {"original_title": "Original A", "tagline": "Tagline"},
                {"original_title": "Original B", "tagline": "Tagline"},
            ),
            (
                ContentItem.ContentType.TV_SHOW,
                ContentItem.SourceAPI.TMDB,
                {"original_title": "Show", "tagline": "Tagline A"},
                {"original_title": "Show", "tagline": "Tagline B"},
            ),
            (
                ContentItem.ContentType.GAME,
                ContentItem.SourceAPI.IGDB,
                {"genres": ["Action"], "themes": ["Erotic"]},
                {"genres": ["Action"], "themes": ["Fantasy"]},
            ),
            (
                ContentItem.ContentType.SEASON,
                ContentItem.SourceAPI.TMDB,
                {"tv_show_name": "Show", "episodes": [{"title": "Pilot", "description": "A"}]},
                {"tv_show_name": "Show", "episodes": [{"title": "Pilot", "description": "B"}]},
            ),
            (
                ContentItem.ContentType.ALBUM,
                ContentItem.SourceAPI.SPOTIFY,
                {"authors": [{"name": "Artist"}], "tracks": [{"title": "Song A"}]},
                {"authors": [{"name": "Artist"}], "tracks": [{"title": "Song B"}]},
            ),
            (
                ContentItem.ContentType.BOOK,
                ContentItem.SourceAPI.OPENLIBRARY,
                {"authors": [{"name": "Author A"}]},
                {"authors": [{"name": "Author B"}]},
            ),
        )
        item_id = 999
        for content_type, provider, before, after in cases:
            with self.subTest(content_type=content_type):
                item = SimpleNamespace(
                    id=item_id, content_type=content_type, source_api=provider
                )
                with patch(
                    "content.services.moderation_service.from_local",
                    return_value={"title": "Same", "description": "Same", **before},
                ):
                    _, original_hash = build_state_and_hash(item)
                with patch(
                    "content.services.moderation_service.from_local",
                    return_value={"title": "Same", "description": "Same", **after},
                ):
                    _, updated_hash = build_state_and_hash(item)
                self.assertNotEqual(original_hash, updated_hash)

    def test_linked_persisted_show_title_fills_season_state_and_changes_hash(self):
        show = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='linked-show',
            content_type=ContentItem.ContentType.TV_SHOW,
        )
        show_detail = TvShowDetail.objects.create(
            content_item=show,
            title='Persisted Parent Show',
        )
        season = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='linked-show:1',
            content_type=ContentItem.ContentType.SEASON,
        )
        SeasonDetail.objects.create(
            content_item=season,
            tv_show=show,
            season_number=1,
            title='Season One',
        )

        state, original_hash = build_state_and_hash(season)

        self.assertEqual(
            state['type_specific']['season']['parent_show_name'],
            'Persisted Parent Show',
        )

        show_detail.title = 'Updated Persisted Parent Show'
        show_detail.save(update_fields=['title'])
        reloaded_season = ContentItem.objects.get(pk=season.pk)
        updated_state, updated_hash = build_state_and_hash(reloaded_season)

        self.assertEqual(
            updated_state['type_specific']['season']['parent_show_name'],
            'Updated Persisted Parent Show',
        )
        self.assertNotEqual(original_hash, updated_hash)

    @override_settings(**ENABLED)
    def test_concrete_model_pre_reuses_judgment_without_second_call(self):
        item = _movie_item()
        first = classify_content_item(item, client=self.client, model='jev-1.13.0')
        second = classify_content_item(item, client=self.client, model='jev-1.13.0')
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(len(self.client.calls), 1)
        self.assertEqual(first.model_name, 'jev-1.13.0')

    @override_settings(**ENABLED)
    def test_changed_source_state_triggers_reclassification(self):
        item = _movie_item()
        classify_content_item(item, client=self.client)
        item.movie_detail.description = 'Updated plot for the movie.'
        item.movie_detail.save()
        classify_content_item(item, client=self.client)
        self.assertEqual(len(self.client.calls), 2)
        self.assertEqual(item.moderation_judgments.count(), 2)

    @override_settings(**DISABLED)
    def test_disabled_mode_returns_skipped_without_client_or_write(self):
        result = classify_content_item(_movie_item(), client_factory=_UnreachableFactory)
        self.assertIsInstance(result, ModerationClassificationOutcome)
        self.assertEqual(result.kind, 'skipped')
        self.assertEqual(result.code, 'moderation_disabled')
        self.assertFalse(ContentModerationJudgment.objects.exists())

    @override_settings(**ENABLED)
    def test_provider_explicit_override_short_circuits_without_jev_call(self):
        item = _movie_item()
        payload = {
            'type': 'movie', 'title': 'Fight Club',
            'description': 'A dystopian drama.',
            'adult': True,
        }
        with patch(
            'content.services.moderation_service.from_local', return_value=payload
        ):
            result = classify_content_item(item, client=self.client)
        self.assertEqual(len(self.client.calls), 0)
        self.assertEqual(result.classification, ContentModerationJudgment.Classification.EXPLICIT)
        self.assertEqual(result.payload['policy']['reason'], 'provider_explicit_override')

    @override_settings(**ENABLED)
    def test_successful_judgment_persists_raw_payload_and_usage(self):
        judgment = classify_content_item(_movie_item(), client=self.client)
        self.assertEqual(judgment.status, ContentModerationJudgment.Status.COMPLETE)
        self.assertEqual(judgment.payload['raw_nouls']['safe_for_automatic_discovery'], 0.9)
        self.assertEqual(judgment.payload['usage']['input_tokens'], 11)
        self.assertEqual(judgment.payload['usage']['output_tokens'], 3)
        self.assertIn('classification_ms', judgment.payload)

    @override_settings(**ENABLED)
    def test_unavailable_failure_returns_typed_outcome_with_no_row(self):
        item = _movie_item()
        result = classify_content_item(item, client=_UnavailableClient())
        self.assertIsInstance(result, ModerationClassificationOutcome)
        self.assertEqual(result.kind, 'unavailable')
        self.assertEqual(result.code, 'typesafe_timeout')
        self.assertFalse(ContentModerationJudgment.objects.exists())

    def test_non_tmdb_providers_never_certify_safety(self):
        for api in (
            ContentItem.SourceAPI.IGDB, ContentItem.SourceAPI.SPOTIFY,
            ContentItem.SourceAPI.OPENLIBRARY,
        ):
            item = _movie_item(source_api=api, external_id=str(api))
            self.assertIsNone(_provider_explicit(item))

    @override_settings(**ENABLED)
    def test_alias_request_resolves_concrete_model_and_records_requested_model(self):
        judgment = classify_content_item(
            _movie_item(), client=_RecordingClient(), model='jev-latest'
        )
        self.assertEqual(judgment.model_name, _RecordingClient().response_model)
        self.assertEqual(judgment.payload['requested_model'], 'jev-latest')

    @override_settings(**ENABLED)
    def test_alias_request_performs_second_call_instead_of_stale_pre_reuse(self):
        item = _movie_item()
        client = _RecordingClient()
        classify_content_item(item, client=client, model='jev-latest')
        classify_content_item(item, client=client, model='jev-latest')
        self.assertEqual(len(client.calls), 2)

    @override_settings(**ENABLED)
    def test_missing_detail_returns_state_unavailable_with_no_client_calls(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='9999',
            content_type=ContentItem.ContentType.MOVIE,
        )
        client = _RecordingClient()
        result = classify_content_item(item, client=client)
        self.assertIsInstance(result, ModerationClassificationOutcome)
        self.assertEqual(result.kind, 'skipped')
        self.assertEqual(result.code, 'state_unavailable')
        self.assertEqual(len(client.calls), 0)
        self.assertFalse(ContentModerationJudgment.objects.exists())

    @override_settings(**ENABLED)
    def test_successful_judgment_never_leaves_pending_state(self):
        judgment = classify_content_item(_movie_item(), client=self.client)
        self.assertEqual(
            ContentModerationJudgment.objects.filter(
                status=ContentModerationJudgment.Status.PENDING,
            ).count(),
            0,
        )
        self.assertEqual(judgment.status, ContentModerationJudgment.Status.COMPLETE)

    def test_canonical_hash_is_nonempty_sha256_hex(self):
        _, digest = build_state_and_hash(_movie_item())
        self.assertEqual(len(digest), 64)
        self.assertTrue(all(c in '0123456789abcdef' for c in digest))

    @override_settings(**ENABLED)
    def test_race_integrity_error_collapses_to_existing_judgment(self):
        item = _movie_item()
        first = classify_content_item(item, client=self.client)
        with patch.object(
            ContentModerationJudgment.objects,
            'get_or_create',
            side_effect=IntegrityError,
        ):
            second = classify_content_item(item, client=self.client)
        self.assertEqual(first.pk, second.pk)

    @override_settings(**ENABLED)
    def test_provider_override_writes_provider_rule_audit_identity(self):
        item = _movie_item()
        payload = {'type': 'movie', 'title': 'x', 'description': 'd', 'adult': True}
        with patch(
            'content.services.moderation_service.from_local', return_value=payload
        ):
            judgment = classify_content_item(item, client=self.client)
        self.assertEqual(judgment.model_name, 'provider-rule:v2')
        self.assertEqual(judgment.payload['requested_model'], 'jev-latest')
        self.assertEqual(judgment.payload['provider_explicit'], True)
        self.assertEqual(judgment.payload['raw_nouls'], {})


def _tmdb_movie(**detail):
    item = ContentItem.objects.create(
        source_api=ContentItem.SourceAPI.TMDB, external_id='movie-rule',
        content_type=ContentItem.ContentType.MOVIE,
    )
    MovieDetail.objects.create(content_item=item, title='Movie', **detail)
    return item


def _tv_item(**detail):
    item = ContentItem.objects.create(
        source_api=ContentItem.SourceAPI.TMDB, external_id='tv-rule',
        content_type=ContentItem.ContentType.TV_SHOW,
    )
    TvShowDetail.objects.create(content_item=item, title='Show', **detail)
    return item


def _game_item(**detail):
    item = ContentItem.objects.create(
        source_api=ContentItem.SourceAPI.IGDB, external_id='game-rule',
        content_type=ContentItem.ContentType.GAME,
    )
    GameDetail.objects.create(content_item=item, title='Game', **detail)
    return item


def _rating(organization, rating, *descriptors):
    return {'organization': organization, 'rating': rating, 'descriptors': list(descriptors)}


class ProviderRuleTests(TestCase):
    """`provider-rule:v2`: only TMDB adult=true and ESRB AO are overrides."""

    def rule(self, item):
        return _provider_explicit(ContentItem.objects.get(pk=item.pk))

    def test_tmdb_movie_and_tv_show_override_only_on_adult_true(self):
        for make in (_tmdb_movie, _tv_item):
            for adult, expected in ((True, True), (False, None), (None, None)):
                with self.subTest(make=make.__name__, adult=adult):
                    item = make(adult=adult)
                    self.assertIs(self.rule(item), expected)
                    item.delete()

    def test_tmdb_certifications_keywords_and_genres_are_never_overrides(self):
        item = _tmdb_movie(
            adult=False,
            genres=['Romance'],
            keywords=['erotic movie', 'softcore'],
            certifications=[{'country': 'US', 'rating': 'NC-17'}],
        )

        self.assertIsNone(self.rule(item))

    def test_igdb_override_only_for_esrb_adults_only(self):
        cases = (
            ([_rating('ESRB', 'AO', 'Sexual Content')], True),
            ([_rating('PEGI', '18'), _rating('ESRB', 'AO')], True),
            ([_rating('ESRB', 'M', 'Nudity', 'Sexual Themes')], None),
            ([_rating('ESRB', 'T')], None),
            ([_rating('PEGI', '18', 'Sex')], None),
            ([_rating('PEGI', 'AO')], None),
            ([_rating('esrb', 'AO')], None),
            ([_rating('ESRB', 'ao')], None),
            ([_rating('ESRB', 'AO ')], None),
            ([], None),
        )
        for age_ratings, expected in cases:
            with self.subTest(age_ratings=age_ratings):
                item = _game_item(age_ratings=age_ratings)
                self.assertIs(self.rule(item), expected)
                item.delete()

    def test_igdb_keywords_alone_are_never_an_override(self):
        item = _game_item(keywords=['sex', 'dating sim'], age_ratings=[_rating('ESRB', 'M')])

        self.assertIsNone(self.rule(item))

    def test_malformed_persisted_age_ratings_never_override(self):
        for bad in ('ESRB AO', ['ESRB AO'], [None], [{'organization': 'ESRB'}],
                    [{'organization': ['ESRB'], 'rating': 'AO'}], {'organization': 'ESRB', 'rating': 'AO'}):
            with self.subTest(bad=bad):
                item = _game_item(age_ratings=bad)
                self.assertIsNone(self.rule(item))
                item.delete()

    def test_esrb_ao_is_not_an_override_for_other_providers_or_types(self):
        game = _game_item(age_ratings=[_rating('ESRB', 'AO')])
        game.source_api = ContentItem.SourceAPI.TMDB
        game.save(update_fields=['source_api'])
        self.assertIsNone(self.rule(game))

    def test_album_explicit_lyrics_and_book_subjects_are_never_overrides(self):
        album = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.SPOTIFY, external_id='album-rule',
            content_type=ContentItem.ContentType.ALBUM,
        )
        detail = AlbumDetail.objects.create(content_item=album, title='Record')
        Track.objects.create(
            album_detail=detail, track_id_external='t1', track_number=1, title='Song', explicit=True)
        book = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.OPENLIBRARY, external_id='book-rule',
            content_type=ContentItem.ContentType.BOOK,
        )
        BookDetail.objects.create(content_item=book, title='Book', subjects=['Erotica'])

        self.assertIsNone(self.rule(album))
        self.assertIsNone(self.rule(book))

    @override_settings(**ENABLED)
    def test_esrb_ao_game_is_classified_explicit_without_a_jev_call(self):
        item = _game_item(age_ratings=[_rating('ESRB', 'AO', 'Sexual Content')])
        client = _RecordingClient()

        judgment = classify_content_item(ContentItem.objects.get(pk=item.pk), client=client)

        self.assertEqual(client.calls, [])
        self.assertEqual(judgment.model_name, 'provider-rule:v2')
        self.assertEqual(judgment.classification, ContentModerationJudgment.Classification.EXPLICIT)
        self.assertIs(judgment.payload['provider_explicit'], True)
        self.assertEqual(judgment.payload['policy']['reason'], 'provider_explicit_override')

    @override_settings(**ENABLED)
    def test_esrb_mature_game_goes_to_jev_with_ratings_as_context(self):
        item = _game_item(
            keywords=['dating sim'], age_ratings=[_rating('ESRB', 'M', 'Nudity', 'Blood')])
        client = _RecordingClient()

        judgment = classify_content_item(ContentItem.objects.get(pk=item.pk), client=client)

        self.assertEqual(len(client.calls), 1)
        game_state = client.calls[0]['type_specific']['game']
        self.assertEqual(game_state['keywords'], ['dating sim'])
        self.assertEqual(game_state['age_ratings'], ['ESRB M: Blood; Nudity'])
        self.assertIsNone(judgment.payload['provider_explicit'])

    @override_settings(**ENABLED)
    def test_tmdb_adult_flag_overrides_but_stays_out_of_the_jev_state(self):
        item = _tmdb_movie(adult=True, keywords=['softcore'])

        judgment = classify_content_item(
            ContentItem.objects.get(pk=item.pk), client=_RecordingClient())

        self.assertEqual(judgment.model_name, 'provider-rule:v2')
        self.assertNotIn('adult', str(judgment.payload['source_state']))
        self.assertEqual(
            judgment.payload['source_state']['type_specific']['movie']['keywords'], ['softcore'])


class ObservationContractTests(TestCase):
    """Invocation metadata: `reused`, `called`, and current-call usage."""

    def setUp(self):
        self.client = _RecordingClient()

    @override_settings(**DISABLED)
    def test_disabled_mode_reports_no_call_and_no_usage(self):
        observation = {}
        classify_content_item(_movie_item(), observation=observation)
        self.assertEqual(
            observation, {'reused': False, 'called': False, 'usage': None}
        )

    @override_settings(**ENABLED)
    def test_state_unavailable_reports_no_call_and_no_usage(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='obs-no-detail',
            content_type=ContentItem.ContentType.MOVIE,
        )
        observation = {}
        classify_content_item(item, client=self.client, observation=observation)
        self.assertEqual(len(self.client.calls), 0)
        self.assertEqual(
            observation, {'reused': False, 'called': False, 'usage': None}
        )

    @override_settings(**ENABLED)
    def test_first_call_reports_called_with_current_usage(self):
        observation = {}
        classify_content_item(
            _movie_item(), client=self.client, observation=observation
        )
        self.assertEqual(observation['reused'], False)
        self.assertEqual(observation['called'], True)
        self.assertEqual(
            observation['usage'], {'input_tokens': 11, 'output_tokens': 3}
        )

    @override_settings(**ENABLED)
    def test_pinned_reuse_reports_reused_without_a_call(self):
        item = _movie_item()
        classify_content_item(item, client=self.client, model='jev-1.13.0')
        observation = {}
        classify_content_item(
            item, client=self.client, model='jev-1.13.0', observation=observation
        )
        self.assertEqual(len(self.client.calls), 1)
        self.assertEqual(
            observation, {'reused': True, 'called': False, 'usage': None}
        )

    @override_settings(**ENABLED)
    def test_provider_override_reports_no_call_and_no_usage(self):
        item = _movie_item()
        payload = {
            'type': 'movie',
            'title': 'Fight Club',
            'description': 'A dystopian drama.',
            'adult': True,
        }
        observation = {}
        with patch(
            'content.services.moderation_service.from_local', return_value=payload
        ):
            classify_content_item(item, client=self.client, observation=observation)
        self.assertEqual(len(self.client.calls), 0)
        self.assertEqual(
            observation, {'reused': False, 'called': False, 'usage': None}
        )

    @override_settings(**ENABLED)
    def test_unavailable_reports_no_call_and_no_usage(self):
        observation = {}
        classify_content_item(
            _movie_item(), client=_UnavailableClient(), observation=observation
        )
        self.assertEqual(
            observation, {'reused': False, 'called': False, 'usage': None}
        )

    @override_settings(**ENABLED)
    def test_response_without_usage_reports_called_with_unreported_tokens(self):
        observation = {}
        classify_content_item(
            _movie_item(), client=_NoUsageClient(), observation=observation
        )
        self.assertEqual(observation['called'], True)
        self.assertEqual(
            observation['usage'], {'input_tokens': None, 'output_tokens': None}
        )

    @override_settings(**ENABLED)
    def test_alias_call_collapsing_onto_existing_row_keeps_current_usage(self):
        item = _movie_item()
        first_client = _RecordingClient(input_tokens=11, output_tokens=3)
        first = classify_content_item(item, client=first_client, model='jev-latest')
        self.assertEqual(first.payload['usage']['input_tokens'], 11)

        # The alias path always calls Jev, and the resolved model already has a
        # row, so the write collapses. Usage must describe THIS call.
        second_client = _RecordingClient(input_tokens=77, output_tokens=9)
        observation = {}
        second = classify_content_item(
            item, client=second_client, model='jev-latest', observation=observation
        )
        self.assertEqual(second.pk, first.pk)
        self.assertEqual(len(second_client.calls), 1)
        self.assertEqual(observation['reused'], True)
        self.assertEqual(observation['called'], True)
        self.assertEqual(
            observation['usage'], {'input_tokens': 77, 'output_tokens': 9}
        )

    @override_settings(**ENABLED)
    def test_observation_is_optional_for_existing_callers(self):
        judgment = classify_content_item(_movie_item(), client=self.client)
        self.assertEqual(judgment.status, ContentModerationJudgment.Status.COMPLETE)
