"""Integration tests for the backfill command (thin slice, fakes at the edge)."""
import json
import os
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

    def _call_with_script(self, script, pks, **kwargs):
        out = []

        class _Stdout:
            def write(self, message):
                out.append(message)

        limit = kwargs.pop('limit')
        extra_argv = kwargs.pop('extra_argv', [])
        argv = ['--confirm-live', f'--limit={limit}']
        argv += [f'--{k.replace("_", "-")}={v}' for k, v in kwargs.items()]
        argv += extra_argv
        with patch(f'{COMMAND}.classify_content_item',
                    side_effect=_fake_classify(script)):
            call_command('backfill_content_moderation', *argv, stdout=_Stdout())
        return None, [json.loads(line) for line in out]

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

    def test_report_missing_directory_fails_closed(self):
        pk = _item('x').pk
        script = {pk: (_judgment(), {'reused': False, 'called': False})}
        with self.assertRaises(CommandError):
            self._call_with_script(script, [pk], limit=1,
                                    report='/nonexistent-dir-xyz/report.json')

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
