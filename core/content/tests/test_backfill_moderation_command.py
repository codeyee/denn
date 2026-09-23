"""Integration tests for the backfill command (thin slice, fakes at the edge)."""
import json
import os
import tempfile
from io import StringIO
from types import SimpleNamespace
from unittest.mock import patch

from django.core.management import CommandError, call_command
from django.test import TestCase

from content.models import ContentItem

COMMAND = 'content.management.commands.backfill_content_moderation'


def _item(external_id):
    return ContentItem.objects.create(
        source_api=ContentItem.SourceAPI.TMDB, external_id=external_id,
        content_type=ContentItem.ContentType.MOVIE)


def _judgment(classification='safe_for_automatic_discovery', usage=None,
              provider_explicit=None):
    return SimpleNamespace(payload={'provider_explicit': provider_explicit},
                           classification=classification,
                           model_name='jev-1.13.0', usage=usage)


def _outcome(kind, code):
    return SimpleNamespace(kind=kind, code=code)


def _fake_classify(script):
    def classify(item, observation=None):
        action = script[item.pk]
        if isinstance(action, Exception):
            raise action
        observation.update(action[1])
        return action[0]
    return classify


class BackfillCommandTests(TestCase):
    def test_requires_confirm_live_before_any_work(self):
        with patch(f'{COMMAND}.classify_content_item') as classify:
            with self.assertRaises(CommandError):
                call_command('backfill_content_moderation', '--limit=1',
                             stdout=open(os.devnull, 'w'))
        self.assertEqual(classify.call_count, 0)

    def test_requires_positive_limit(self):
        for args in ([], ['--confirm-live', '--limit=0'],
                     ['--confirm-live', '--limit=-3']):
            with self.subTest(args=args), self.assertRaises(CommandError):
                call_command('backfill_content_moderation', *args,
                             stdout=open(os.devnull, 'w'))

    def test_processes_exact_limit_in_pk_order(self):
        pks = [_item(str(i)).pk for i in range(5)]
        script = {pk: (_judgment(), {'reused': False, 'called': True,
                                     'usage': {'input_tokens': 1,
                                               'output_tokens': 0}})
                  for pk in pks}
        with patch(f'{COMMAND}.classify_content_item',
                    side_effect=_fake_classify(script)):
            _, events = self._call_with_script(script, pks, limit=3)
        items = [e for e in events if e['event'] == 'item']
        self.assertEqual([e['item_id'] for e in items], pks[:3])
        summary = events[-1]
        self.assertEqual(summary['event'], 'final_summary')
        self.assertEqual((summary['scanned'], summary['created'],
                          summary['last_id']), (3, 3, pks[2]))

    def test_exact_ids_process_only_the_supplied_sparse_ids(self):
        all_pks = [_item(str(i)).pk for i in range(5)]
        selected_ids = (all_pks[0], all_pks[2], all_pks[4])
        script = {pk: (_judgment(), {'reused': False, 'called': True,
                                     'usage': {'input_tokens': 1,
                                               'output_tokens': 0}})
                  for pk in selected_ids}
        called_ids, events = self._call_with_script(
            script, selected_ids, limit=len(selected_ids),
            extra_argv=[f'--ids={",".join(map(str, selected_ids))}',
                        '--batch-size=2'])

        self.assertEqual(called_ids, list(selected_ids))
        self.assertEqual(events[0], {
            'event': 'selection', 'mode': 'exact_ids', 'selected': 3})
        item_ids = [event['item_id'] for event in events
                    if event['event'] == 'item']
        self.assertEqual(item_ids, list(selected_ids))
        self.assertEqual(events[-1]['selection'], {
            'mode': 'exact_ids', 'selected': 3})
        self.assertEqual(events[-1]['scanned'], 3)

    def test_invalid_exact_ids_fail_before_runner_classifier_or_output(self):
        valid_id = _item('valid').pk
        invalid_values = ('', f'{valid_id},not-an-id', f'{valid_id},{valid_id}',
                          f'{valid_id},0', f'{valid_id},-2')
        for ids in invalid_values:
            with self.subTest(ids=ids):
                output = StringIO()
                with patch(f'{COMMAND}.run_backfill') as runner, \
                        patch(f'{COMMAND}.classify_content_item') as classify, \
                        self.assertRaises(CommandError):
                    call_command('backfill_content_moderation',
                                 '--confirm-live', '--limit=5',
                                 f'--ids={ids}', stdout=output)
                runner.assert_not_called()
                classify.assert_not_called()
                self.assertEqual(output.getvalue(), '')

    def test_missing_exact_ids_fail_before_classifier_or_report_output(self):
        existing_id = _item('existing').pk
        missing_id = existing_id + 10_000
        with tempfile.TemporaryDirectory() as root:
            report_path = os.path.join(root, 'report.json')
            output = StringIO()
            with patch(f'{COMMAND}.run_backfill') as runner, \
                    patch(f'{COMMAND}.classify_content_item') as classify, \
                    self.assertRaisesRegex(CommandError,
                                           f'missing ContentItem IDs .*{missing_id}'):
                call_command('backfill_content_moderation',
                             '--confirm-live', '--limit=2',
                             f'--ids={existing_id},{missing_id}',
                             f'--report={report_path}', stdout=output)
            runner.assert_not_called()
            classify.assert_not_called()
            self.assertEqual(output.getvalue(), '')
            self.assertFalse(os.path.exists(report_path))

    def test_exact_ids_reject_after_id_repeated_selector_and_short_limit(self):
        pks = [_item(str(i)).pk for i in range(3)]
        ids_argument = f'--ids={pks[0]},{pks[2]}'
        invalid_argv = (
            [ids_argument, '--after-id=0'],
            [ids_argument, f'--ids={pks[1]}'],
            [ids_argument],
        )
        for extra_argv in invalid_argv:
            with self.subTest(extra_argv=extra_argv):
                output = StringIO()
                with patch(f'{COMMAND}.run_backfill') as runner, \
                        patch(f'{COMMAND}.classify_content_item') as classify, \
                        self.assertRaises(CommandError):
                    call_command('backfill_content_moderation',
                                 '--confirm-live', '--limit=1', *extra_argv,
                                 stdout=output)
                runner.assert_not_called()
                classify.assert_not_called()
                self.assertEqual(output.getvalue(), '')

    def _call_with_script(self, script, pks, **kwargs):
        out = []
        called_ids = []

        class _Stdout:
            def write(self, message):
                out.append(message)

        limit = kwargs.pop('limit')
        extra_argv = kwargs.pop('extra_argv', [])
        argv = ['--confirm-live', f'--limit={limit}']
        argv += [f'--{k.replace("_", "-")}={v}' for k, v in kwargs.items()]
        argv += extra_argv
        scripted_classify = _fake_classify(script)

        def classify(item, observation=None):
            called_ids.append(item.pk)
            return scripted_classify(item, observation)

        with patch(f'{COMMAND}.classify_content_item',
                    side_effect=classify):
            call_command('backfill_content_moderation', *argv, stdout=_Stdout())
        return called_ids, [json.loads(line) for line in out]

    def test_summary_accounting_flows_into_cost_and_missing(self):
        pks = [_item('a').pk, _item('b').pk, _item('c').pk]
        script = {
            pks[0]: (_judgment(), {'reused': True, 'called': True,
                                   'usage': {'input_tokens': 1_000_000,
                                             'output_tokens': 0}}),
            pks[1]: (_judgment(), {'reused': False, 'called': True, 'usage': None}),
            pks[2]: (_outcome('unavailable', 'typesafe_timeout'),
                     {'reused': False, 'called': False}),
        }
        _, events = self._call_with_script(script, pks, limit=3)
        summary = events[-1]
        self.assertEqual((summary['reused'], summary['input_tokens'],
                          summary['missing_usage'], summary['unavailable']),
                         (1, 1_000_000, 1, 1))
        self.assertEqual(summary['estimated_cost_usd'], 0.042)
        self.assertIn('source_url', summary['pricing_snapshot'])

    def test_price_override_and_progress_lines(self):
        pks = [_item(str(i)).pk for i in range(3)]
        script = {pk: (_judgment(), {'reused': False, 'called': True,
                                     'usage': {'input_tokens': 1_000_000,
                                               'output_tokens': 0}})
                  for pk in pks}
        _, events = self._call_with_script(script, pks, limit=3,
                                            **{'input_price_per_1m': '0.10',
                                               'progress_every': 2})
        summary = events[-1]
        self.assertEqual(summary['estimated_cost_usd'], 0.30)
        progress = [e for e in events if e['event'] == 'progress']
        self.assertEqual([p['scanned'] for p in progress], [2])

    def test_report_written_atomically(self):
        from django.conf import settings
        path = os.path.join(settings.BASE_DIR, 'backfill-report-test.json')
        try:
            pk = _item('r').pk
            script = {pk: (_judgment(), {'reused': False, 'called': False})}
            _, events = self._call_with_script(script, [pk], limit=1, report=path)
            with open(path, encoding='utf-8') as handle:
                self.assertEqual(json.load(handle), events[-1])
            leftovers = [name for name in os.listdir(os.path.dirname(path))
                         if name.startswith('.backfill-')]
            self.assertEqual(leftovers, [])
        finally:
            if os.path.exists(path):
                os.unlink(path)

    def test_exact_ids_report_includes_selection_metadata(self):
        from django.conf import settings
        path = os.path.join(settings.BASE_DIR, 'backfill-exact-report-test.json')
        try:
            pk = _item('exact-report').pk
            script = {pk: (_judgment(), {'reused': False, 'called': False})}
            self._call_with_script(
                script, [pk], limit=1, report=path,
                extra_argv=[f'--ids={pk}'])
            with open(path, encoding='utf-8') as handle:
                report = json.load(handle)
            self.assertEqual(report['selection'], {
                'mode': 'exact_ids', 'selected': 1})
            self.assertEqual(report['scanned'], 1)
        finally:
            if os.path.exists(path):
                os.unlink(path)

    def test_invalid_report_paths_fail_before_work_without_creating_paths(self):
        with tempfile.TemporaryDirectory() as root:
            missing_parent = os.path.join(root, 'missing')
            missing_report = os.path.join(missing_parent, 'report.json')
            file_parent = os.path.join(root, 'not-a-directory')
            with open(file_parent, 'w', encoding='utf-8') as handle:
                handle.write('not a directory')
            existing_directory = os.path.join(root, 'report-directory')
            os.mkdir(existing_directory)

            invalid_paths = (
                ('empty path', ''),
                ('NUL byte in path', os.path.join(root, 'bad\x00name.json')),
                ('missing parent', missing_report),
                ('parent is a file', os.path.join(file_parent, 'report.json')),
                ('destination is a directory', existing_directory),
            )
            for label, report_path in invalid_paths:
                with self.subTest(path=label):
                    with patch(f'{COMMAND}.run_backfill') as runner, \
                            patch(f'{COMMAND}.classify_content_item') as classify:
                        with open(os.devnull, 'w', encoding='utf-8') as stdout:
                            with self.assertRaises(CommandError):
                                call_command(
                                    'backfill_content_moderation',
                                    '--confirm-live', '--limit=1',
                                    f'--report={report_path}', stdout=stdout)
                        runner.assert_not_called()
                        classify.assert_not_called()

            self.assertFalse(os.path.exists(missing_parent))
            self.assertFalse(os.path.exists(missing_report))
            self.assertEqual(os.listdir(existing_directory), [])

    def test_invalid_option_values_rejected(self):
        pk = _item('v').pk
        script = {pk: (_judgment(), {'reused': False, 'called': False})}
        for extra in ('--batch-size=0', '--delay-ms=-1', '--progress-every=0',
                      '--max-retry-ids=-1', '--input-price-per-1m=banana',
                      '--input-price-per-1m=-2'):
            with self.subTest(extra=extra):
                with self.assertRaises(CommandError):
                    self._call_with_script(script, [pk], limit=1,
                                            extra_argv=[extra])
