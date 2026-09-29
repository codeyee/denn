"""Offline coverage for the stratified moderation-candidate exporter."""
import hashlib
import json
import os
import tempfile
from io import StringIO
from unittest.mock import patch

from django.core.management import CommandError, call_command
from django.test import TestCase

from content.models import BookDetail, ContentItem, GameDetail, MovieDetail
from content.moderation.evaluation_cases import GOLD_SCHEMA_VERSION, validate_gold_dataset

COMMAND = 'content.management.commands.export_moderation_evaluation_candidates'
SENSITIVE_DESCRIPTIONS = (
    'An erotic thriller about desire.',
    'Graphic torture and gore throughout.',
    'A nazi occupation drama.',
    'Adult-only content, rated 18+.',
)
PLAIN_DESCRIPTION = 'A quiet story about a lighthouse keeper.'


def _create(source_api, content_type, detail_model, external_id, title, description):
    item = ContentItem.objects.create(
        source_api=source_api, external_id=external_id, content_type=content_type)
    detail_model.objects.create(content_item=item, title=title, description=description)
    return item


def _movie(external_id, title, description=PLAIN_DESCRIPTION):
    return _create(
        ContentItem.SourceAPI.TMDB, ContentItem.ContentType.MOVIE, MovieDetail,
        external_id, title, description)


def _game(external_id, title, description=PLAIN_DESCRIPTION):
    return _create(
        ContentItem.SourceAPI.IGDB, ContentItem.ContentType.GAME, GameDetail,
        external_id, title, description)


def _book(external_id, title, description=PLAIN_DESCRIPTION):
    return _create(
        ContentItem.SourceAPI.OPENLIBRARY, ContentItem.ContentType.BOOK, BookDetail,
        external_id, title, description)


class ExportCandidatesTestCase(TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.directory = directory.name

    def export(self, *args, name='candidates.json'):
        path = os.path.join(self.directory, name)
        stdout = StringIO()
        call_command('export_moderation_evaluation_candidates', f'--output={path}',
                     *args, stdout=stdout)
        with open(path, encoding='utf-8') as handle:
            document = json.load(handle)
        with open(path + '.index.json', encoding='utf-8') as handle:
            index = json.load(handle)
        return document, index, stdout.getvalue()

    def create_catalog(self):
        for number, description in enumerate(SENSITIVE_DESCRIPTIONS):
            _movie(f'ext-sensitive-{number}', f'Sensitive Movie {number}', description)
        for number in range(8):
            _movie(f'ext-plain-{number}', f'Plain Movie {number}')
        for number in range(6):
            _game(f'ext-game-{number}', f'Plain Game {number}')
        for number in range(3):
            _book(f'ext-book-{number}', f'Plain Book {number}')


class ExportSamplingTests(ExportCandidatesTestCase):
    def setUp(self):
        super().setUp()
        self.create_catalog()

    def test_same_seed_and_catalog_produce_identical_output(self):
        first, first_index, _ = self.export('--sample-size=10', name='a.json')
        second, second_index, _ = self.export('--sample-size=10', name='b.json')
        other, _, _ = self.export('--sample-size=10', '--seed=another', name='c.json')

        self.assertEqual(first, second)
        self.assertEqual(first_index, second_index)
        self.assertNotEqual(
            [case['case_id'] for case in first['cases']],
            [case['case_id'] for case in other['cases']],
        )

    def test_cases_are_sorted_and_use_opaque_seeded_ids(self):
        document, index, _ = self.export('--sample-size=10', '--seed=fixed')

        case_ids = [case['case_id'] for case in document['cases']]
        self.assertEqual(case_ids, sorted(case_ids))
        for case_id, pk in index.items():
            digest = hashlib.sha256(f'fixed:{pk}'.encode()).hexdigest()[:12]
            self.assertEqual(case_id, f'case_{digest}')

    def test_strata_floor_and_total_size(self):
        document, _, _ = self.export('--sample-size=15', '--min-per-stratum=3')

        strata = document['sampling']['strata']
        self.assertEqual(len(document['cases']), 15)
        self.assertEqual(
            {key: value['eligible'] for key, value in strata.items()},
            {'tmdb/MOVIE': 12, 'igdb/GAME': 6, 'openlibrary/BOOK': 3},
        )
        self.assertEqual(strata['openlibrary/BOOK']['selected'], 3)
        for value in strata.values():
            self.assertGreaterEqual(value['selected'], 3)
        self.assertEqual(sum(value['selected'] for value in strata.values()), 15)
        for case in document['cases']:
            self.assertIn(case['sampling_stratum'], strata)

    def test_small_stratum_is_taken_whole_and_sample_is_capped_by_eligible(self):
        document, _, _ = self.export('--sample-size=500', '--min-per-stratum=30')

        self.assertEqual(len(document['cases']), 21)
        self.assertEqual(document['sampling']['strata']['openlibrary/BOOK']['selected'], 3)

    def test_sample_size_below_floor_total_is_still_respected(self):
        document, _, _ = self.export('--sample-size=4', '--min-per-stratum=3')

        self.assertEqual(len(document['cases']), 4)

    def test_sensitive_candidates_are_drawn_first_up_to_the_share(self):
        ContentItem.objects.exclude(content_type=ContentItem.ContentType.MOVIE).delete()

        document, _, _ = self.export(
            '--sample-size=6', '--min-per-stratum=100', '--sensitive-share=1')

        movies = document['sampling']['strata']['tmdb/MOVIE']
        self.assertEqual(
            (movies['eligible'], movies['sensitive_eligible'], movies['selected']),
            (12, 4, 6),
        )
        self.assertEqual(movies['selected_sensitive'], 4)
        for case in document['cases']:
            self.assertEqual(
                case['sensitive_candidate'],
                case['state']['title'].startswith('Sensitive'),
            )

    def test_partial_share_takes_share_of_allocation_from_sensitive_first(self):
        ContentItem.objects.exclude(content_type=ContentItem.ContentType.MOVIE).delete()

        document, _, _ = self.export(
            '--sample-size=4', '--min-per-stratum=100', '--sensitive-share=0.5')

        self.assertGreaterEqual(
            document['sampling']['strata']['tmdb/MOVIE']['selected_sensitive'], 2)
        self.assertEqual(len(document['cases']), 4)

    def test_zero_share_draws_uniformly_from_all_eligible_items(self):
        ContentItem.objects.exclude(content_type=ContentItem.ContentType.MOVIE).delete()

        document, _, _ = self.export(
            '--sample-size=12', '--min-per-stratum=100', '--sensitive-share=0')

        self.assertEqual(document['sampling']['strata']['tmdb/MOVIE']['selected'], 12)


class ExportSkipTests(ExportCandidatesTestCase):
    def test_ineligible_items_are_skipped_and_counted(self):
        kept = _movie('ext-kept', 'Kept Movie')
        ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB, external_id='ext-no-detail',
            content_type=ContentItem.ContentType.MOVIE)
        _movie('ext-url', 'Url Movie', 'See https://example.com/page for details.')
        _movie('ext-large', 'Large Movie', 'word ' * 400)

        document, index, stdout = self.export('--max-state-bytes=1000')

        self.assertEqual(
            document['sampling']['skipped'],
            {'no_detail': 1, 'invalid_state': 1, 'oversized_state': 1},
        )
        self.assertEqual(list(index.values()), [kept.pk])
        self.assertEqual(len(document['cases']), 1)
        self.assertEqual(document['sampling']['strata']['tmdb/MOVIE']['eligible'], 1)
        summary = json.loads(stdout)
        self.assertEqual(summary['cases'], 1)
        self.assertEqual(summary['sampling'], document['sampling'])
        self.assertNotIn('Kept Movie', stdout)

    def test_state_is_never_modified_to_pass_validation(self):
        _movie('ext-www', 'Www Movie', 'Visit www.example.org today.')

        document, _, _ = self.export()

        self.assertEqual(document['cases'], [])
        self.assertEqual(document['sampling']['skipped']['invalid_state'], 1)


class ExportOutputTests(ExportCandidatesTestCase):
    def test_output_is_a_gold_document_once_a_placeholder_label_is_added(self):
        self.create_catalog()

        document, _, _ = self.export('--sample-size=10', '--min-per-stratum=2')

        self.assertEqual(document['schema_version'], 'jev-moderation-candidates/v1')
        self.assertEqual(
            set(document['sampling']),
            {'seed', 'sample_size', 'min_per_stratum', 'sensitive_share',
             'max_state_bytes', 'strata', 'skipped'},
        )
        self.assertEqual(
            (document['sampling']['seed'], document['sampling']['sample_size'],
             document['sampling']['sensitive_share'],
             document['sampling']['max_state_bytes']),
            ('denn-jev-eval-v1', 10, 0.35, 20000),
        )
        labeled = []
        for case in document['cases']:
            self.assertEqual(case['split'], 'evaluation')
            self.assertEqual(case['source_kind'], 'catalog_text')
            self.assertIsNone(case['provider_explicit'])
            candidate_only = {'sampling_stratum', 'sensitive_candidate'}
            labeled.append({
                **{key: value for key, value in case.items() if key not in candidate_only},
                'language': 'en',
                'gold_class': 'needs_review',
                'adjudication': {
                    'status': 'human_adjudicated',
                    'reviewer_count': 1,
                    'guideline_revision': 'placeholder',
                },
            })
        validated = validate_gold_dataset(
            {'schema_version': GOLD_SCHEMA_VERSION, 'cases': labeled})
        self.assertEqual(len(validated), len(document['cases']))

    def test_main_file_hides_identifiers_and_sidecar_maps_case_ids(self):
        self.create_catalog()
        path = os.path.join(self.directory, 'candidates.json')

        document, index, _ = self.export('--sample-size=21', '--min-per-stratum=30')

        with open(path, encoding='utf-8') as handle:
            text = handle.read()
        self.assertNotIn('ext-', text)
        for forbidden in ('"id"', '"external_id"', '"content_item_id"', '"pk"', 'http'):
            self.assertNotIn(forbidden, text)
        self.assertEqual(
            set(index), {case['case_id'] for case in document['cases']})
        for case_id, pk in index.items():
            item = ContentItem.objects.get(pk=pk)
            case = next(c for c in document['cases'] if c['case_id'] == case_id)
            self.assertEqual(case['provider'], item.source_api)
            self.assertEqual(case['content_type'], item.content_type.lower())
        for name in ('candidates.json', 'candidates.json.index.json'):
            mode = os.stat(os.path.join(self.directory, name)).st_mode
            self.assertEqual(mode & 0o077, 0)

    def test_provider_explicit_comes_from_the_service_rule(self):
        _movie('ext-adult', 'Adult Movie')
        _game('ext-game', 'Some Game')

        with patch(f'{COMMAND}._provider_explicit',
                   side_effect=lambda item: item.source_api == 'tmdb' or None):
            document, _, _ = self.export()

        by_provider = {case['provider']: case['provider_explicit']
                       for case in document['cases']}
        self.assertEqual(by_provider, {'tmdb': True, 'igdb': None})

    def test_exported_state_carries_safety_context_and_esrb_ao_is_a_valid_override(self):
        movie = _movie('ext-context', 'Context Movie')
        MovieDetail.objects.filter(content_item=movie).update(
            adult=False, genres=['Drama'], keywords=['heist'],
            certifications=[{'country': 'US', 'rating': 'R'}, {'country': 'ZZ', 'rating': 'X'}])
        game = _game('ext-ao', 'Adults Only Game')
        GameDetail.objects.filter(content_item=game).update(
            keywords=['sex'],
            age_ratings=[{'organization': 'ESRB', 'rating': 'AO', 'descriptors': ['Sexual Content']}])

        document, _, _ = self.export()

        by_provider = {case['provider']: case for case in document['cases']}
        self.assertEqual(by_provider['tmdb']['state']['type_specific']['movie'], {
            'original_title': '', 'tagline': '', 'genres': ['Drama'], 'keywords': ['heist'],
            'certifications': ['US: R'],
        })
        self.assertIsNone(by_provider['tmdb']['provider_explicit'])
        self.assertIs(by_provider['igdb']['provider_explicit'], True)
        self.assertEqual(
            by_provider['igdb']['state']['type_specific']['game']['age_ratings'],
            ['ESRB AO: Sexual Content'])
        self.assertEqual(document['sampling']['skipped']['invalid_state'], 0)

    def test_leaves_no_temporary_files_and_writes_nothing_to_the_catalog(self):
        _movie('ext-only', 'Only Movie')
        before = ContentItem.objects.count()

        self.export()

        self.assertEqual(ContentItem.objects.count(), before)
        self.assertEqual(
            sorted(os.listdir(self.directory)),
            ['candidates.json', 'candidates.json.index.json'],
        )


class ExportIdsFileTests(ExportCandidatesTestCase):
    def ids_file(self, *lines, name='ids.txt'):
        path = os.path.join(self.directory, name)
        with open(path, 'w', encoding='utf-8') as handle:
            handle.write('\n'.join(str(line) for line in lines) + '\n')
        return path

    def test_exports_exactly_the_listed_items_and_ignores_sampling_options(self):
        self.create_catalog()
        chosen = list(ContentItem.objects.order_by('pk').values_list('pk', flat=True))[3:8]

        document, index, _ = self.export(
            f'--ids-file={self.ids_file(*chosen)}',
            '--sample-size=1', '--min-per-stratum=0', '--sensitive-share=0')

        self.assertEqual(sorted(index.values()), chosen)
        self.assertEqual(len(document['cases']), len(chosen))
        sampling = document['sampling']
        self.assertEqual(sampling['ids_requested'], len(chosen))
        for ignored in ('sample_size', 'min_per_stratum', 'sensitive_share'):
            self.assertNotIn(ignored, sampling)
        for value in sampling['strata'].values():
            self.assertEqual(value['selected'], value['eligible'])
        self.assertEqual(sampling['skipped'],
                         {'no_detail': 0, 'invalid_state': 0, 'oversized_state': 0, 'not_found': 0})

    def test_reexport_of_an_earlier_sample_keeps_case_ids_and_reflects_the_new_state(self):
        self.create_catalog()
        earlier, earlier_index, _ = self.export(
            '--sample-size=8', '--seed=fixed', name='earlier.json')
        movie_pk = next(pk for pk in earlier_index.values()
                        if ContentItem.objects.get(pk=pk).content_type == 'MOVIE')
        MovieDetail.objects.filter(content_item_id=movie_pk).update(keywords=['softcore'])

        again, again_index, _ = self.export(
            f'--ids-file={self.ids_file(*earlier_index.values())}', '--seed=fixed',
            name='again.json')

        self.assertEqual(again_index, earlier_index)
        self.assertEqual([case['case_id'] for case in again['cases']],
                         [case['case_id'] for case in earlier['cases']])
        keywords = {
            case['case_id']: case['state']['type_specific'].get('movie', {}).get('keywords')
            for case in again['cases']
        }
        self.assertEqual(keywords[next(k for k, v in again_index.items() if v == movie_pk)],
                         ['softcore'])

    def test_missing_ineligible_and_duplicate_ids_are_skipped_or_collapsed_and_counted(self):
        kept = _movie('ext-kept', 'Kept Movie')
        no_detail = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB, external_id='ext-no-detail',
            content_type=ContentItem.ContentType.MOVIE)
        url = _movie('ext-url', 'Url Movie', 'See https://example.com/page for details.')
        large = _movie('ext-large', 'Large Movie', 'word ' * 400)
        missing = max(kept.pk, no_detail.pk, url.pk, large.pk) + 1000
        ids = self.ids_file(kept.pk, '', no_detail.pk, f' {url.pk} ', large.pk, kept.pk, missing)

        document, index, _ = self.export(f'--ids-file={ids}', '--max-state-bytes=1000')

        self.assertEqual(list(index.values()), [kept.pk])
        self.assertEqual(document['sampling']['ids_requested'], 5)
        self.assertEqual(
            document['sampling']['skipped'],
            {'no_detail': 1, 'invalid_state': 1, 'oversized_state': 1, 'not_found': 1},
        )

    def test_items_outside_the_ids_file_are_not_exported(self):
        listed = _movie('ext-listed', 'Listed Movie')
        _movie('ext-unlisted', 'Unlisted Movie')

        document, _, _ = self.export(f'--ids-file={self.ids_file(listed.pk)}')

        self.assertEqual([case['state']['title'] for case in document['cases']], ['Listed Movie'])

    def test_invalid_ids_file_fails_before_any_database_read(self):
        missing = os.path.join(self.directory, 'nope.txt')
        for path in (
            missing,
            self.ids_file(name='empty.txt'),
            self.ids_file('12', 'abc', name='text.txt'),
            self.ids_file('0', name='zero.txt'),
            self.ids_file('-4', name='negative.txt'),
            self.ids_file('1.5', name='float.txt'),
            self.ids_file('1 2', name='pair.txt'),
            self.ids_file('\u0661\u0662', name='arabic-digits.txt'),
        ):
            with self.subTest(path=os.path.basename(path)), self.assertNumQueries(0):
                with self.assertRaises(CommandError):
                    call_command(
                        'export_moderation_evaluation_candidates',
                        f'--output={os.path.join(self.directory, "out.json")}',
                        f'--ids-file={path}', stdout=StringIO())
        self.assertFalse(os.path.exists(os.path.join(self.directory, 'out.json')))


class ExportValidationTests(ExportCandidatesTestCase):
    def test_invalid_output_fails_before_any_database_read(self):
        os.mkdir(os.path.join(self.directory, 'as-directory'))
        os.mkdir(os.path.join(self.directory, 'sidecar-dir.json.index.json'))
        for path in (
            os.path.join(self.directory, 'missing', 'out.json'),
            os.path.join(self.directory, 'as-directory'),
            os.path.join(self.directory, 'sidecar-dir.json'),
            os.path.join(self.directory, 'nul\x00.json'),
            '',
        ):
            with self.subTest(path=path), self.assertNumQueries(0):
                with self.assertRaises(CommandError):
                    call_command('export_moderation_evaluation_candidates',
                                 f'--output={path}', stdout=StringIO())

    def test_rejects_invalid_numeric_arguments(self):
        for args in (
            ['--sample-size=0'], ['--sample-size=abc'], ['--min-per-stratum=-1'],
            ['--sensitive-share=1.5'], ['--sensitive-share=nan'],
            ['--max-state-bytes=0'], ['--seed='],
        ):
            with self.subTest(args=args), self.assertNumQueries(0):
                with self.assertRaises(CommandError):
                    call_command(
                        'export_moderation_evaluation_candidates',
                        f'--output={os.path.join(self.directory, "out.json")}',
                        *args, stdout=StringIO())

    def test_requires_output(self):
        with self.assertRaises(CommandError):
            call_command('export_moderation_evaluation_candidates', stdout=StringIO())
