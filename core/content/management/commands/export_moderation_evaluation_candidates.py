"""Export stratified, unlabeled Jev moderation evaluation candidates.

Reads the local catalog read-only and writes cases whose `state` is exactly the
text production sends to Jev. Cases carry no labels: a human adjudicates them
before they can join a gold dataset. Sampling is stratified by
(source_api, content_type), keeps a per-stratum floor, and is deterministic for
the same catalog and arguments. With `--ids-file` nothing is sampled: exactly
the listed items are exported (each still subject to the eligibility checks),
which lets an earlier sample be re-exported against a newer moderation state.

The sensitive-term lexicon only enriches the sample so rare sensitive items are
not drowned out by uniform draws. It is not a classifier, and a match is
neither a label nor evidence about the item. Eligible states are held in memory
until allocation, which suits local catalogs of a few thousand items.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import random
import re
import tempfile
from argparse import ArgumentTypeError
from typing import Any, NamedTuple

from django.core.management.base import BaseCommand, CommandError

from content.models import ContentItem
from content.moderation import ModerationStateError
from content.moderation.evaluation_cases import (
    GOLD_SCHEMA_VERSION,
    GoldCaseValidationError,
    validate_gold_dataset,
)
from content.services.moderation_service import _provider_explicit, build_state_and_hash

CANDIDATES_SCHEMA_VERSION = 'jev-moderation-candidates/v1'
_INDEX_SUFFIX = '.index.json'
_ITERATOR_CHUNK_SIZE = 500
_CASE_FIELDS = (
    'case_id', 'split', 'source_kind', 'provider', 'content_type', 'state',
    'provider_explicit',
)

_SENSITIVE_LEXICON = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r'\bsex(?:ual(?:ly)?|o)?\b',
        r'\ber[oó]tic\w*',
        r'\bporn\w*',
        r'\bnud(?:e|es|ity)\b',
        r'\bdesnud\w*',
        r'\bnaked\b',
        r'\bhentai\b',
        r'\bxxx\b',
        r'\bfetish\w*',
        r'\bbdsm\b',
        r'\borg(?:y|ies)\b',
        r'\bstrippers?\b',
        r'\bprostitut\w*',
        r'\bescorts?\b',
        r'\bseduct\w*',
        r'\blust\b',
        r'\badult[- ]only\b',
        r'(?<![\w+])18\+',
        r'\bexplicit(?:ly)?\b',
        r'\badultos\b',
        r'\bgor(?:e|y)\b',
        r'\btortur\w*',
        r'\bdismember\w*',
        r'\bcannibal\w*',
        r'\bsnuff\b',
        r'\bmass?acre\w*',
        r'\brap(?:e|es|ed)\b',
        r'\bviolaci[oó]n\b',
        r'\bincest\w*',
        r'\bpedophil\w*',
        r'\bnazi\w*',
        r'\bextremis\w*',
        r'\bwhite\s+power\b',
        r'\bpropaganda\b',
        r'\bjihad\w*',
    )
)


class _Candidate(NamedTuple):
    pk: int
    sensitive: bool
    case: dict[str, Any]


def _positive_int(raw):
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise ArgumentTypeError('must be a positive integer')
    if isinstance(raw, bool) or value <= 0:
        raise ArgumentTypeError('must be a positive integer')
    return value


def _non_negative_int(raw):
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise ArgumentTypeError('must be a non-negative integer')
    if isinstance(raw, bool) or value < 0:
        raise ArgumentTypeError('must be a non-negative integer')
    return value


def _share(raw):
    try:
        value = float(raw)
    except (TypeError, ValueError):
        raise ArgumentTypeError('must be a number between 0 and 1')
    if isinstance(raw, bool) or not 0 <= value <= 1:
        raise ArgumentTypeError('must be a number between 0 and 1')
    return value


def _seed(raw):
    if not isinstance(raw, str) or not raw.strip():
        raise ArgumentTypeError('must be a non-empty string')
    return raw


def _read_ids_file(path: str) -> list[int]:
    """Return the sorted, de-duplicated ContentItem ids listed one per line."""
    if not isinstance(path, str) or not path or '\x00' in path:
        raise CommandError('invalid --ids-file path')
    try:
        with open(path, encoding='utf-8') as handle:
            lines = handle.read().splitlines()
    except (OSError, UnicodeError) as error:
        raise CommandError(f'cannot read --ids-file: {error}') from error

    ids = set()
    for number, line in enumerate(lines, start=1):
        text = line.strip()
        if not text:
            continue
        if not text.isascii() or not text.isdecimal() or int(text) <= 0:
            raise CommandError(f'--ids-file line {number}: expected a positive integer id')
        ids.add(int(text))
    if not ids:
        raise CommandError('--ids-file contains no ids')
    return sorted(ids)


def _validate_output_path(path: str) -> None:
    if not isinstance(path, str) or not path:
        raise CommandError('invalid --output path: path must be a non-empty string')
    if '\x00' in path:
        raise CommandError('invalid --output path: NUL bytes are not allowed')

    try:
        absolute_path = os.path.abspath(path)
        directory = os.path.dirname(absolute_path)
    except (OSError, TypeError, ValueError) as error:
        raise CommandError(f'invalid --output path: {error}') from error

    if not os.path.isdir(directory):
        raise CommandError(
            f'output parent is missing or not a directory: {directory}')
    if not os.access(directory, os.W_OK):
        raise CommandError(f'output directory is not writable: {directory}')
    if os.path.isdir(absolute_path):
        raise CommandError(f'output path is a directory: {absolute_path}')


def _write_json_atomic(path: str, document: dict) -> None:
    directory = os.path.dirname(os.path.abspath(path))
    fd, tmp_path = tempfile.mkstemp(dir=directory, prefix='.moderation-candidates-',
                                     suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as handle:
            json.dump(document, handle, ensure_ascii=False, indent=2)
            handle.write('\n')
        os.replace(tmp_path, path)
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def _state_bytes(state: dict) -> int:
    return len(json.dumps(
        state, ensure_ascii=False, sort_keys=True, separators=(',', ':'),
    ).encode())


def _state_texts(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from _state_texts(item)
    elif isinstance(value, (list, tuple)):
        for item in value:
            yield from _state_texts(item)


def _is_sensitive_candidate(state: dict) -> bool:
    texts = _state_texts((state['title'], state['description'], state['type_specific']))
    return any(
        pattern.search(text) for text in texts for pattern in _SENSITIVE_LEXICON
    )


def _passes_gold_shape(case: dict) -> bool:
    document = {
        'schema_version': GOLD_SCHEMA_VERSION,
        'cases': [{
            **{field: case[field] for field in _CASE_FIELDS},
            'language': 'other',
            'gold_class': 'safe_for_automatic_discovery',
            'adjudication': {
                'status': 'human_adjudicated',
                'reviewer_count': 1,
                'guideline_revision': 'placeholder',
            },
        }],
    }
    try:
        validate_gold_dataset(document)
    except GoldCaseValidationError:
        return False
    return True


def _case_id(seed: str, pk: int) -> str:
    return 'case_' + hashlib.sha256(f'{seed}:{pk}'.encode()).hexdigest()[:12]


def _catalog_items(ids: list[int] | None):
    """Yield catalog items in pk order: all of them, or only the listed ids."""
    items = ContentItem.objects.order_by('pk')
    if ids is None:
        yield from items.iterator(chunk_size=_ITERATOR_CHUNK_SIZE)
        return
    for start in range(0, len(ids), _ITERATOR_CHUNK_SIZE):
        yield from items.filter(pk__in=ids[start:start + _ITERATOR_CHUNK_SIZE])


def _scan_catalog(seed: str, max_state_bytes: int, ids: list[int] | None = None):
    eligible: dict[str, list[_Candidate]] = {}
    skipped = {'no_detail': 0, 'invalid_state': 0, 'oversized_state': 0}
    found = 0
    for item in _catalog_items(ids):
        found += 1
        stratum = f'{item.source_api}/{item.content_type}'
        pool = eligible.setdefault(stratum, [])
        try:
            state, _ = build_state_and_hash(item)
        except ModerationStateError:
            skipped['no_detail'] += 1
            continue
        if _state_bytes(state) > max_state_bytes:
            skipped['oversized_state'] += 1
            continue

        sensitive = _is_sensitive_candidate(state)
        case = {
            'case_id': _case_id(seed, item.pk),
            'split': 'evaluation',
            'source_kind': 'catalog_text',
            'provider': item.source_api.lower(),
            'content_type': item.content_type.lower(),
            'state': state,
            'provider_explicit': _provider_explicit(item),
            'sampling_stratum': stratum,
            'sensitive_candidate': sensitive,
        }
        if not _passes_gold_shape(case):
            skipped['invalid_state'] += 1
            continue
        pool.append(_Candidate(item.pk, sensitive, case))
    if ids is not None:
        skipped['not_found'] = len(ids) - found
    return eligible, skipped


def _apportion(total: int, weights: dict[str, int]) -> dict[str, int]:
    """Split `total` by largest remainder; never exceeds a weight when total <= sum."""
    weight_sum = sum(weights.values())
    if not total or not weight_sum:
        return dict.fromkeys(weights, 0)
    shares = {key: total * weight // weight_sum for key, weight in weights.items()}
    by_remainder = sorted(
        weights, key=lambda key: (-(total * weights[key] % weight_sum), key))
    for key in by_remainder[:total - sum(shares.values())]:
        shares[key] += 1
    return shares


def _allocate(counts: dict[str, int], sample_size: int, min_per_stratum: int):
    total = min(sample_size, sum(counts.values()))
    floors = {key: min(min_per_stratum, count) for key, count in counts.items()}
    floor_total = sum(floors.values())
    if total <= floor_total:
        return _apportion(total, floors)
    spare = {key: counts[key] - floors[key] for key in counts}
    extra = _apportion(total - floor_total, spare)
    return {key: floors[key] + extra[key] for key in counts}


def _select(pool: list[_Candidate], count: int, sensitive_share: float, rng: random.Random):
    sensitive = [candidate for candidate in pool if candidate.sensitive]
    # Rounding first removes float noise, e.g. 100 * 0.29 == 28.999999999999996.
    quota = min(len(sensitive), math.floor(round(count * sensitive_share, 9)))
    chosen = rng.sample(sensitive, quota)
    chosen_pks = {candidate.pk for candidate in chosen}
    rest = [candidate for candidate in pool if candidate.pk not in chosen_pks]
    chosen.extend(rng.sample(rest, count - len(chosen)))
    return chosen


def _stratum_summary(pool: list[_Candidate], chosen: list[_Candidate]) -> dict[str, int]:
    return {
        'eligible': len(pool),
        'sensitive_eligible': sum(candidate.sensitive for candidate in pool),
        'selected': len(chosen),
        'selected_sensitive': sum(candidate.sensitive for candidate in chosen),
    }


class Command(BaseCommand):
    help = ('Export a stratified JSON file of unlabeled Jev moderation '
            'evaluation candidates from the local catalog (read-only). Also '
            f'writes a private sidecar OUTPUT{_INDEX_SUFFIX} mapping case IDs '
            'to ContentItem IDs; never commit or share that sidecar.')

    def add_arguments(self, parser):
        parser.add_argument('--output', required=True,
                            help='destination JSON file (atomic write)')
        parser.add_argument('--sample-size', type=_positive_int, default=300)
        parser.add_argument('--min-per-stratum', type=_non_negative_int, default=30)
        parser.add_argument(
            '--sensitive-share', type=_share, default=0.35,
            help='target share of each stratum drawn from lexicon matches')
        parser.add_argument('--seed', type=_seed, default='denn-jev-eval-v1')
        parser.add_argument('--max-state-bytes', type=_positive_int, default=20_000)
        parser.add_argument(
            '--ids-file', metavar='PATH',
            help=('newline-separated ContentItem ids to export instead of '
                  'sampling (for example the values of an earlier sidecar); '
                  'ineligible ids are skipped and counted, and --sample-size, '
                  '--min-per-stratum, and --sensitive-share are ignored'))

    def handle(self, *args, **options):
        output = options['output']
        index_path = output + _INDEX_SUFFIX
        for path in (output, index_path):
            _validate_output_path(path)
        ids = _read_ids_file(options['ids_file']) if options['ids_file'] else None

        seed = options['seed']
        eligible, skipped = _scan_catalog(seed, options['max_state_bytes'], ids)
        if ids is None:
            selected, strata = self._sample(eligible, seed, options)
        else:
            selected, strata = self._select_all(eligible)

        selected.sort(key=lambda candidate: candidate.case['case_id'])
        if len({candidate.case['case_id'] for candidate in selected}) != len(selected):
            raise CommandError('case ID collision; choose a different --seed')
        sampling = {'seed': seed}
        if ids is None:
            sampling.update({
                'sample_size': options['sample_size'],
                'min_per_stratum': options['min_per_stratum'],
                'sensitive_share': options['sensitive_share'],
            })
        else:
            sampling['ids_requested'] = len(ids)
        sampling.update({
            'max_state_bytes': options['max_state_bytes'],
            'strata': strata,
            'skipped': skipped,
        })
        document = {
            'schema_version': CANDIDATES_SCHEMA_VERSION,
            'sampling': sampling,
            'cases': [candidate.case for candidate in selected],
        }
        index = {candidate.case['case_id']: candidate.pk for candidate in selected}

        try:
            _write_json_atomic(index_path, index)
            _write_json_atomic(output, document)
        except OSError as error:
            raise CommandError(f'cannot write --output: {error}')
        self.stdout.write(json.dumps(
            {'sampling': sampling, 'cases': len(selected)},
            sort_keys=True, separators=(',', ':')))

    @staticmethod
    def _sample(eligible, seed, options):
        allocation = _allocate(
            {key: len(pool) for key, pool in eligible.items()},
            options['sample_size'], options['min_per_stratum'])
        rng = random.Random(seed)
        selected: list[_Candidate] = []
        strata = {}
        for stratum in sorted(eligible):
            chosen = _select(
                eligible[stratum], allocation[stratum], options['sensitive_share'], rng)
            selected.extend(chosen)
            strata[stratum] = _stratum_summary(eligible[stratum], chosen)
        return selected, strata

    @staticmethod
    def _select_all(eligible):
        selected: list[_Candidate] = []
        strata = {}
        for stratum in sorted(eligible):
            selected.extend(eligible[stratum])
            strata[stratum] = _stratum_summary(eligible[stratum], eligible[stratum])
        return selected, strata
