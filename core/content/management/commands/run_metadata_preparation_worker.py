"""Run bounded Core metadata preparation for queued homepage identities."""
from __future__ import annotations

import signal
import threading

from django.core.management.base import BaseCommand, CommandError

from content.services.metadata_preparation_worker import (
    DEFAULT_BASE_BACKOFF_SECONDS,
    DEFAULT_BATCH_SIZE,
    DEFAULT_LEASE_SECONDS,
    DEFAULT_MAX_ATTEMPTS,
    DEFAULT_MAX_BACKOFF_SECONDS,
    MAX_BATCH_SIZE,
    MIN_LEASE_SECONDS,
    run_metadata_preparation_batch,
)


class Command(BaseCommand):
    help = 'Prepare canonical Core metadata for queued homepage identities; does not backfill.'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='Process one batch and exit.')
        parser.add_argument('--batch-size', type=int, default=DEFAULT_BATCH_SIZE)
        parser.add_argument('--poll-interval', type=float, default=5.0)
        parser.add_argument('--lease-seconds', type=int, default=DEFAULT_LEASE_SECONDS)
        parser.add_argument('--max-attempts', type=int, default=DEFAULT_MAX_ATTEMPTS)
        parser.add_argument('--base-backoff', type=int, default=DEFAULT_BASE_BACKOFF_SECONDS)
        parser.add_argument('--max-backoff', type=int, default=DEFAULT_MAX_BACKOFF_SECONDS)

    def handle(self, *args, **options):
        if not 1 <= options['batch_size'] <= MAX_BATCH_SIZE:
            raise CommandError(f'--batch-size must be between 1 and {MAX_BATCH_SIZE}')
        if not 0.1 <= options['poll_interval'] <= 300:
            raise CommandError('--poll-interval must be between 0.1 and 300 seconds')
        for name in ('max_attempts', 'base_backoff', 'max_backoff'):
            if options[name] < 1:
                raise CommandError(f'--{name.replace("_", "-")} must be positive')
        if options['lease_seconds'] < MIN_LEASE_SECONDS:
            raise CommandError(f'--lease-seconds must be at least {MIN_LEASE_SECONDS}')
        if options['base_backoff'] > options['max_backoff']:
            raise CommandError('--base-backoff cannot exceed --max-backoff')

        stopping = threading.Event()
        previous_handlers = {}

        def request_stop(signum, _frame):
            stopping.set()

        for signum in (signal.SIGINT, signal.SIGTERM):
            previous_handlers[signum] = signal.signal(signum, request_stop)
        try:
            while not stopping.is_set():
                result = run_metadata_preparation_batch(
                    batch_size=options['batch_size'],
                    lease_seconds=options['lease_seconds'],
                    max_attempts=options['max_attempts'],
                    base_backoff_seconds=options['base_backoff'],
                    max_backoff_seconds=options['max_backoff'],
                )
                self.stdout.write(
                    'metadata_preparation_worker: counts=%s duration_ms=%d'
                    % (result.counts, result.duration_ms)
                )
                if options['once'] or stopping.is_set():
                    break
                stopping.wait(options['poll_interval'])
        finally:
            for signum, handler in previous_handlers.items():
                signal.signal(signum, handler)
