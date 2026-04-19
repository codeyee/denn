# Runbook — `rehydrate_content_details`

Sprint 07 introduces local-first content detail storage. The
`rehydrate_content_details` Django management command refreshes locally
cached `MovieDetail` / `TvShowDetail` / `SeasonDetail` / `AlbumDetail` /
`GameDetail` / `BookDetail` rows that have aged past their per-type TTL by
re-fetching from the Go proxy and re-running the type-specific mapper.

This is the **periodic refresh** job. The first-time backfill of items that
do not yet have a Detail row at all is `backfill_content_details` (Sprint
07 / PR-7E).

## When to run

Recommended cadence per type — the TTLs live in
`core.settings.CONTENT_REHYDRATION_TTL`:

| content_type | default TTL | suggested cron |
| --- | --- | --- |
| `MOVIE` | 30 days | weekly |
| `TV_SHOW` | 7 days | daily |
| `SEASON` | 7 days | daily |
| `ALBUM` | 30 days | weekly |
| `GAME` | 30 days | weekly |
| `BOOK` | 90 days | monthly |

Run after any of the following:

- A mapper change in `core/content/services/local_content_store/mappers/`
  (use `--ttl-override 0` to force every Detail row through the mapper).
- A proxy-side schema bump documented in `docs/contracts/internal-http.md`.
- Spike in stale-on-failure responses observed in the
  `event=orchestrator` logs (`fresh_local` ratio dropping).

## Usage

```bash
python manage.py rehydrate_content_details \
  --content-type MOVIE \
  --limit 500 \
  --workers 4
```

Common flags:

- `--content-type ALL|MOVIE|TV_SHOW|SEASON|ALBUM|GAME|BOOK` — process one
  type or every type sequentially. Default: `ALL`.
- `--limit N` — cap per content_type. Default: 200.
- `--dry-run` — print the planned work without calling the proxy or
  writing.
- `--ttl-override DAYS` — use `DAYS` as the TTL instead of the per-type
  setting. Useful for catch-up jobs after a config change.
- `--workers K` — parallel proxy fetches per content_type. Default: 4.
  Use `--workers 1` when running against SQLite locally to avoid
  table-lock contention.

## Output and metrics

Every type emits one structured log line on stdout in the same shape used
by the Sprint 6C observability scaffolding:

```json
{"event":"rehydrate","content_type":"MOVIE","total":42,"refreshed":40,"unchanged":1,"errors":1,"latency_ms":12345}
```

- `refreshed` — `ensure_content_detail` ran and persisted a new payload.
- `unchanged` — the proxy returned no payload (404, timeout, or
  upstream miss), so the existing Detail was kept untouched.
- `errors` — a mapper raised. Sample stack traces appear in `logger.exception`
  output and the first five `content_item` ids surface to stderr.

Plot `refreshed / total` per type to monitor proxy-side health, and
alert when `errors > 0` for any type.

## Failure modes

- **Proxy down.** `ProxyAPIClient` swallows network errors and returns
  `None`, so `ensure_content_detail` reports `unchanged=N`. The local
  Detail rows stay valid (`is_stale=true` will appear in subsequent
  read-path responses once the orchestrator fires; see
  `source_data_orchestrator`).
- **Mapper raises.** Sprint 07 mappers wrap their writes in
  `transaction.atomic()`. The previous Detail row is preserved. Counted
  as `errors`.
- **`auto_now=True` clamping.** `MovieDetail.last_refreshed_at` is an
  `auto_now` field — the only way to artificially age a row is via
  `MovieDetail.objects.filter(...).update(last_refreshed_at=...)`. Tests
  do this; the command itself never needs to.
- **SQLite lock contention.** Run with `--workers 1` when targeting
  SQLite (the test runner already does this transparently).

## Verifying a run

```bash
# Stale detail rows by type, before:
python manage.py shell -c "
from datetime import timedelta
from django.utils import timezone
from content.models import ContentItem
from content.models.detail import MovieDetail
cutoff = timezone.now() - timedelta(days=30)
print(MovieDetail.objects.filter(last_refreshed_at__lt=cutoff).count())
"

python manage.py rehydrate_content_details --content-type MOVIE --limit 50

# After: the count above should be approximately N - 50.
```

## Related

- Read-path orchestrator: `core/content/services/source_data_orchestrator.py`
- Local persistence entry point: `core/content/services/local_content_store/__init__.py`
- Mappers: `core/content/services/local_content_store/mappers/`
- First-time backfill (PR-7E): `backfill_content_details`
- TTL settings: `CONTENT_REHYDRATION_TTL` in `core/core/settings/base.py`
