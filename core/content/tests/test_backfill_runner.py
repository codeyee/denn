"""Offline pure tests for the backfill execution runner (slice 2C)."""
import json
import unittest
from types import SimpleNamespace

from content.services.backfill_metrics import default_pricing
from content.services.backfill_runner import (
    BackfillRunConfig,
    iter_ordered,
    run_backfill,
)


def _item(pk):
    return SimpleNamespace(pk=pk)


def _judgment(classification='safe_for_automatic_discovery', usage=None,
              provider_explicit=None, model='jev-1.13.0'):
    return SimpleNamespace(payload={'provider_explicit': provider_explicit},
                           classification=classification, model_name=model,
                           usage=usage)


def _outcome(kind, code):
    return SimpleNamespace(kind=kind, code=code)


def _fetcher(pages):
    calls = []

    def fetch(after_id, size):
        calls.append((after_id, size))
        return list(pages.pop(0)) if pages else []

    fetch.calls = calls
    return fetch


def _run(fetch, classify, **overrides):
    events = []
    params = {'after_id': 0, 'limit': 0, 'batch_size': 200, 'delay_ms': 0,
              'progress_every': 50, 'max_retry_ids': 100}
    params.update(overrides)
    summary = run_backfill(fetch_page=fetch, classify=classify,
                           config=BackfillRunConfig(**params),
                           pricing=default_pricing(), emit=events.append,
                           clock=_clock(), sleep=_sleeper())
    return summary, events


def _clock():
    ticks = [0.0]
    return lambda: ticks.__setitem__(0, ticks[0] + 0.5) or ticks[0]


def _sleeper():
    calls = []

    def sleep(seconds):
        calls.append(seconds)

    sleep.calls = calls
    return sleep


class OrderingTests(unittest.TestCase):
    def test_pages_advance_cursor_in_ascending_order(self):
        fetch = _fetcher([[_item(2), _item(3)], [_item(9)]])
        self.assertEqual([i.pk for i in iter_ordered(fetch, after_id=1, batch_size=2)],
                         [2, 3, 9])
        self.assertEqual(fetch.calls, [(1, 2), (3, 2)])

    def test_sparse_pks_with_exact_limit(self):
        fetch = _fetcher([[_item(5), _item(900)], [_item(44000)]])
        seen = []

        def classify(item, observation):
            seen.append(item.pk)
            observation.update({'reused': False, 'called': True,
                                'usage': {'input_tokens': 1, 'output_tokens': 0}})
            return _judgment()

        summary, _ = _run(fetch, classify, limit=2)
        self.assertEqual((seen, summary['scanned'], summary['last_id']), ([5, 900], 2, 900))

    def test_repeated_or_regressed_pk_raises(self):
        for pages in ([[_item(2), _item(2)]], [[_item(4), _item(3)]]):
            with self.subTest(pages=pages), self.assertRaises(ValueError):
                list(iter_ordered(_fetcher(pages), after_id=1, batch_size=5))

    def test_config_rejects_bad_bounds_and_bools(self):
        for kwargs in ({'after_id': -1}, {'limit': -1}, {'batch_size': 0},
                       {'delay_ms': -1}, {'progress_every': 0},
                       {'max_retry_ids': -1}, {'limit': True}):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                BackfillRunConfig(**kwargs)


class ExecutionTests(unittest.TestCase):
    def _classify(self, script):
        def classify(item, observation):
            action = script[item.pk]
            if isinstance(action, Exception):
                raise action
            observation.update(action[1])
            return action[0]
        return classify

    def test_mixed_outcomes_continue_with_bounded_retry_ids(self):
        fetch = _fetcher([[_item(1), _item(2), _item(3), _item(4)]])
        classify = self._classify({
            1: (_judgment(), {'reused': False, 'called': True,
                              'usage': {'input_tokens': 4, 'output_tokens': 1}}),
            2: (_outcome('unavailable', 'typesafe_timeout'), {'reused': False,
                                                              'called': False}),
            3: RuntimeError('boom'),
            4: (_outcome('skipped', 'moderation_disabled'), {'reused': False,
                                                             'called': False}),
        })
        summary, events = _run(fetch, classify, max_retry_ids=1)
        self.assertEqual((summary['created'], summary['unavailable'], summary['error'],
                          summary['skipped']), (1, 1, 1, 1))
        self.assertEqual((summary['input_tokens'], summary['missing_usage']), (4, 0))
        self.assertEqual((summary['unavailable_item_ids'],
                          summary['failed_item_ids']), ([2], [3]))
        self.assertEqual([e['outcome'] for e in events if e['event'] == 'item'],
                         ['classified', 'unavailable', 'error', 'skipped'])
        self.assertEqual(events[-1]['event'], 'final_summary')

    def test_retry_ids_stay_bounded_over_many_failures(self):
        fetch = _fetcher([[_item(i) for i in range(1, 8)]])

        def classify(item, observation):
            raise RuntimeError('always')

        summary, _ = _run(fetch, classify, max_retry_ids=2)
        self.assertEqual((summary['error'], summary['failed_item_ids'],
                          summary['failed_item_ids_truncated_count'],
                          summary['failed_item_ids_truncated']), (7, [1, 2], 5, True))

    def test_alias_collapse_and_missing_usage_accounting(self):
        fetch = _fetcher([[_item(1), _item(2)]])
        classify = self._classify({
            1: (_judgment(), {'reused': True, 'called': True,
                              'usage': {'input_tokens': 77, 'output_tokens': 9}}),
            2: (_judgment(), {'reused': False, 'called': True, 'usage': None}),
        })
        summary, _ = _run(fetch, classify)
        self.assertEqual((summary['reused'], summary['input_tokens'],
                          summary['output_tokens'], summary['missing_usage']),
                         (1, 77, 9, 1))

    def test_provider_override_counts_without_call_tokens(self):
        fetch = _fetcher([[_item(1)]])
        classify = self._classify({
            1: (_judgment(provider_explicit=True),
                {'reused': False, 'called': False, 'usage': None}),
        })
        summary, events = _run(fetch, classify)
        self.assertEqual((summary['provider_override'], summary['input_tokens'],
                          summary['missing_usage']), (1, 0, 0))
        self.assertEqual(events[0]['classification'], 'safe_for_automatic_discovery')

    def test_delay_only_between_attempts_and_progress_cadence(self):
        fetch = _fetcher([[_item(1), _item(2), _item(3)]])
        sleeps, emits = [], []

        def classify(item, observation):
            observation.update({'reused': False, 'called': False})
            return _outcome('skipped', 'moderation_disabled')

        summary = run_backfill(
            fetch_page=fetch, classify=classify,
            config=BackfillRunConfig(delay_ms=250, progress_every=2),
            pricing=default_pricing(), emit=emits.append,
            clock=_clock(), sleep=sleeps.append)
        self.assertEqual((len(sleeps), sleeps and sleeps[0]), (2, 0.25))
        progress = [e for e in emits if e['event'] == 'progress']
        self.assertEqual([p['scanned'] for p in progress], [2])
        self.assertEqual(json.loads(json.dumps(emits)), emits)
        self.assertEqual(summary['scanned'], 3)
