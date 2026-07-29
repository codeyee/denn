# Runbook — `rehydrate_content_details`

The `rehydrate_content_details` Django management command refreshes
locally cached `MovieDetail` / `TvShowDetail` / `SeasonDetail` /
`AlbumDetail` / `GameDetail` / `BookDetail` rows whose dynamic refresh
window has expired, by re-fetching from the Go proxy and re-running the
type-specific mapper. For games, it also selects existing `GameDetail` rows
that do not yet have an IGDB `GameDurationEstimate`, even when their normal
refresh window is still fresh.

This is the **periodic refresh** job. The first-time backfill of items that do not yet have a Detail row at all is `backfill_content_details`. The game-duration gap is therefore repaired both when a game is read through the local-first path and when this job runs.

## When to run

Recommended cadence depends on
`core.settings.CONTENT_REHYDRATION_POLICY`, not on a fixed per-type TTL.
The exact stale selection is now computed from release-date age bands in
`core/content/services/local_content_store/refresh_policy.py`.

Operational defaults:

| content_type | suggested cron |
| --- | --- |
| `MOVIE` | daily or weekly depending on volume |
| `TV_SHOW` | daily |
| `SEASON` | daily |
| `ALBUM` | weekly |
| `GAME` | weekly |
| `BOOK` | weekly or monthly depending on volume |

Run after any of the following:

- A mapper change in `core/content/services/local_content_store/mappers/`
  (use `--ttl-override 0` to force every Detail row through the mapper).
- A proxy-side schema bump documented in `docs/contracts/internal-http.md`.
- Spike in stale-on-failure responses observed in the
  `event=orchestrator` logs (`fresh_local` ratio dropping).
- A change to `CONTENT_REHYDRATION_POLICY`.
- The first deployment of game-duration support, to backfill existing games:
  `python manage.py rehydrate_content_details --content-type GAME --limit 500 --workers 4`.

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
  policy result. Useful for catch-up jobs after a config change.
- `--workers K` — parallel proxy fetches per content_type. Default: 4.
  Use `--workers 1` when running against SQLite locally to avoid
  table-lock contention.

Related rollout helper:

```bash
python manage.py normalize_rehydration_timestamps --dry-run
python manage.py normalize_rehydration_timestamps --apply --stagger-hours 24
```

Use `normalize_rehydration_timestamps` when a policy change would make
too many currently-fresh rows expire around the same time.

## Output and metrics

Every type emits one structured log line on stdout:

```json
{"event":"rehydrate","content_type":"MOVIE","total":42,"refreshed":40,"unchanged":1,"errors":1,"latency_ms":12345,"by_band":{"hot":{"total":12,"refreshed":12,"unchanged":0,"errors":0}}}
```

- `refreshed` — `ensure_content_detail` ran and persisted a new payload.
- `unchanged` — the proxy returned no payload (404, timeout, or
  upstream miss), so the existing Detail was kept untouched.
- `errors` — a mapper raised. Sample stack traces appear in `logger.exception`
  output and the first five `content_item` ids surface to stderr.
- `by_band` — grouped summary by age band (`hot`, `recent`, `classic`,
  etc.) so rollout behavior can be inspected quickly.

Plot `refreshed / total` per type to monitor proxy-side health, and
alert when `errors > 0` for any type.

## Failure modes

- **Proxy down.** `ProxyAPIClient` swallows network errors and returns
  `None`, so `ensure_content_detail` reports `unchanged=N`. The local
  Detail rows stay valid (`is_stale=true` will appear in subsequent
  read-path responses once the orchestrator fires; see
  `source_data_orchestrator`).
- **Mapper raises.** Mappers wrap their writes in `transaction.atomic()`. The previous Detail row is preserved. Counted as `errors`.
- **`auto_now=True` clamping.** `MovieDetail.last_refreshed_at` is an
  `auto_now` field — the only way to artificially age a row is via
  `MovieDetail.objects.filter(...).update(last_refreshed_at=...)`. Tests
  do this; the command itself never needs to.
- **SQLite lock contention.** Run with `--workers 1` when targeting
  SQLite (the test runner already does this transparently).

## Verifying a run

```bash
# Dry-run first:
python manage.py rehydrate_content_details --content-type MOVIE --limit 50 --dry-run

# Then run a small live batch:
python manage.py rehydrate_content_details --content-type MOVIE --limit 50

# For policy changes, inspect rollout shape before applying:
python manage.py normalize_rehydration_timestamps --dry-run
```

For a release or policy change, look for:

- `errors == 0`
- no unexpected spike in `total` for hot/recent bands
- reasonable `by_band` distribution
- no proxy throttling or request storms in downstream logs

## Related

- Read-path orchestrator: `core/content/services/source_data_orchestrator.py`
- Local persistence entry point: `core/content/services/local_content_store/__init__.py`
- Mappers: `core/content/services/local_content_store/mappers/`
- First-time backfill: `backfill_content_details`
- Policy settings: `CONTENT_REHYDRATION_POLICY` in `core/core/settings/base.py`
- Policy design: `../architecture/content-rehydration-policy.md`
