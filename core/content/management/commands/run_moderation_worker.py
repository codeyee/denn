"""Run bounded incremental moderation work from the Core outbox."""
from __future__ import annotations

import signal
import threading

from django.core.management.base import BaseCommand, CommandError

from content.services.moderation_job_worker import (
    DEFAULT_BASE_BACKOFF_SECONDS,
    DEFAULT_MAX_ATTEMPTS,
    DEFAULT_MAX_BACKOFF_SECONDS,
    run_moderation_batch,
)


class Command(BaseCommand):
    help = 'Process queued incremental moderation jobs; does not backfill existing content.'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='Process one batch and exit.')
        parser.add_argument('--batch-size', type=int, default=10)
        parser.add_argument('--poll-interval', type=float, default=5.0)
        parser.add_argument('--lease-seconds', type=int, default=120)
        parser.add_argument('--max-attempts', type=int, default=DEFAULT_MAX_ATTEMPTS)
        parser.add_argument('--base-backoff', type=int, default=DEFAULT_BASE_BACKOFF_SECONDS)
        parser.add_argument('--max-backoff', type=int, default=DEFAULT_MAX_BACKOFF_SECONDS)

    def handle(self, *args, **options):
        positive = ('batch_size', 'lease_seconds', 'max_attempts', 'base_backoff', 'max_backoff')
        for name in positive:
            if options[name] < 1:
                raise CommandError(f'--{name.replace("_", "-")} must be positive')
        if options['poll_interval'] <= 0:
            raise CommandError('--poll-interval must be positive')

        stopping = threading.Event()
        previous_handlers = {}

        def request_stop(signum, _frame):
            stopping.set()

        for signum in (signal.SIGINT, signal.SIGTERM):
            previous_handlers[signum] = signal.signal(signum, request_stop)

        try:
            while not stopping.is_set():
                result = run_moderation_batch(
                    batch_size=options['batch_size'],
                    lease_seconds=options['lease_seconds'],
                    max_attempts=options['max_attempts'],
                    base_backoff_seconds=options['base_backoff'],
                    max_backoff_seconds=options['max_backoff'],
                )
                self.stdout.write(
                    'moderation_worker: counts=%s duration_ms=%d'
                    % (result.counts, result.duration_ms)
                )
                if options['once'] or stopping.is_set():
                    break
                stopping.wait(options['poll_interval'])
        finally:
            for signum, handler in previous_handlers.items():
                signal.signal(signum, handler)
