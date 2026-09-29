# Jev moderation worker operations

This guide covers the two supervised Core workers. They are opt-in local
processes and are not part of ordinary app startup. Neither worker performs a
catalog backfill. The initial production setup remains blocked on an approved
external process manifest; this repository has no checked-in Dokploy worker
manifest, and no live platform state is asserted here.

## Production activation checklist

Do the steps in order and confirm each observation before the next one. This
checklist does not authorize inspecting or changing the live platform, starting
a worker, calling Jev, or running a production backfill; see the
[production setup gate](#production-setup-gate).

1. **Deploy with both flags off and migrations applied.** Deploy the normal
   Core release and wait for its migration step and `/api/` healthcheck to
   succeed. The production entrypoint (`core/docker-entrypoint.sh`) runs
   `python manage.py migrate --noinput` before Gunicorn. Leave
   `MODERATION_CLASSIFICATION_ENABLED` unset or `False` on Core and
   `WEB_MODERATION_VISIBILITY_ENABLED` unset or `false` on Web. If this
   release changes the moderation state or question revision (`q4` did), do
   [Revising the moderation state or questions](#revising-the-moderation-state-or-questions)
   now, while classification is still off, before any worker starts.
2. **Set server-only settings and pin the model.** Set `TYPESAFE_API_KEY` only
   in Core's server environment, never in Web or browser settings. The
   moderation worker and any Core process that runs the backfill call Jev and
   need it. The Gunicorn process and the metadata-preparation worker never
   call Jev, so they do not need the key (the local Compose profile blanks it
   for the metadata worker). Set `MODERATION_MODEL=jev-1.13.0` (a concrete
   version, not the default `jev-latest` alias) on Core and on both worker
   processes. The requested model is part of the outbox job identity, so every
   process that writes normalized detail or drains a queue must agree.
3. **Start one replica of each worker.** Use the same Core image with a command
   override, the HTTP healthcheck disabled, and no migrate step:
   `python manage.py run_metadata_preparation_worker` and
   `python manage.py run_moderation_worker`. Both accept `--batch-size`,
   `--poll-interval`, `--lease-seconds`, `--max-attempts`, `--base-backoff`,
   and `--max-backoff`; `--once` processes a single batch and exits. With the
   classification flag off nothing new is enqueued and the moderation worker
   makes no Jev call. Keep one
   replica of each until target-environment PostgreSQL concurrency and
   persistence fencing are verified; per-process batch and polling limits are
   not a global Jev rate or cost limit. Neither worker performs a catalog
   backfill.
4. **Enable classification and watch the job tables.** Set
   `MODERATION_CLASSIFICATION_ENABLED=True` on Core and both workers and
   restart them. The value is case-sensitive: only exactly `True` enables it,
   and lowercase `true` leaves classification disabled. Watch the aggregate
   job-state queries under
   [Local Compose](#local-compose-explicit-opt-in) for
   `content_metadata_preparation_job` and `content_moderation_job`, including
   `retry`, `failed`, and `outcome_unknown`. Reconcile `outcome_unknown`
   manually before any retry. Do not put content payloads or credentials in
   logs or reports.
5. **Backfill existing rows in bounded batches.** First run
   `python manage.py backfill_moderation_source_hashes --limit N` (repeat with
   `--after-id <next_after_id>` from its output until `examined=0`). It
   populates missing current source hashes from local normalized detail with
   no Jev call. (Existing hashes are refreshed by `--recompute`, not by this
   step; see the state-revision section.) Without a current hash, a legacy row's judgment reads as
   `stale`. (While classification is on, homepage resolution also admits a
   metadata-preparation job for such a row, and the worker recomputes its
   hash; this backfill is still the bounded way to cover the wider catalog.) Then classify with `python manage.py backfill_content_moderation
   --confirm-live --limit N` as described in the
   [content moderation backfill runbook](./content-moderation-backfill.md).
   Do this only after explicit authorization for the exact environment,
   selection, item cap, report path, and estimated cost. Start with a small
   sample and record tokens, duration, estimated cost, and bounded error IDs.
   Never infer authorization from `--confirm-live`.
6. **Enable Web visibility last, once homepage candidates are classified.**
   The homepage is strict, so it shows only currently safe items: turning the
   Web flag on before classification has caught up leaves it thin or empty.
   Enable it only after both workers have been running with classification on
   and the backfill sample is reviewed. Confirm with the
   [readiness queries](#homepage-readiness-check) that the preparation and
   moderation queues are drained (no growing `queued`/`retry` backlog, and any
   `failed` or `outcome_unknown` rows reconciled) and that current safe
   judgments exist for the homepage candidates. Then, with the release
   separately approved, set `WEB_MODERATION_VISIBILITY_ENABLED=true` on every
   Web instance and restart them together. The Web server treats any value
   other than `true` (case-insensitive, surrounding whitespace ignored) as off.
   Reload browser clients afterward. See [Web visibility rollout and
   rollback](#web-visibility-rollout-and-rollback). While classification is
   enabled and the workers run, the homepage heals itself: each homepage
   resolution admits preparation and classification jobs for candidates that
   lack them, so new candidates become eligible within worker polling time
   without operator action. It never re-queues a `failed` or `outcome_unknown`
   job; reconcile those manually.
7. **Rollback in reverse order.** First set `WEB_MODERATION_VISIBILITY_ENABLED`
   to `false` (or unset it) on every Web instance and restart them. Then set
   `MODERATION_CLASSIFICATION_ENABLED=False` on Core and the workers, which
   prevents new Jev classification and leaves incremental jobs queued. Then
   stop the workers. Judgments and jobs are retained; no schema rollback is
   needed.

Do not infer production state from repository configuration. No admin panel or
production worker deployment is included in this change.

## Revising the moderation state or questions

Any change to the state builder (`content/moderation/state.py`) or the question
wording ships with a new `MODERATION_QUESTION_REVISION`. `q4` added provider
safety metadata to the state, so every hash materialized under `q3` is
outdated, and the new fields exist only on rows written after the Core and
Proxy release. Judgments from earlier revisions stay immutable history and are
not current under the new one. Do these steps in order, with
`MODERATION_CLASSIFICATION_ENABLED` off (or the moderation worker stopped), so
nothing classifies half-hydrated or outdated input:

1. **Deploy Proxy, then Core, and apply migrations.** Proxy must already return
   the safety fields (see the internal HTTP contract), and Core applies
   migration `0028_provider_safety_metadata`.
2. **Rehydrate existing details so rows gain the new fields.** Run
   `python manage.py rehydrate_content_details --ttl-override 0 --limit N
   --workers K`, per `--content-type` if you prefer (see the
   [rehydration runbook](./rehydrate-content.md)). Each item costs one Proxy
   detail request, so size `N` to the provider quotas you reviewed. Each run
   takes the oldest-refreshed rows first, so run about `ceil(rows / N)`
   batches per type rather than waiting for zero candidates: with a zero TTL a
   refreshed row is eligible again once the older ones are exhausted. Rows
   that are not rehydrated keep empty safety fields, which reads as unknown,
   never as safe.
3. **Recompute the source hashes.** Run
   `python manage.py backfill_moderation_source_hashes --recompute --limit N`
   and repeat with `--after-id <next_after_id>` until `examined=0`. It reads
   local detail only (no Jev or Proxy call), is idempotent, and reports
   `changed`, `unchanged`, and `unverified` counts; a second pass should show
   `changed=0`. Items with no hash are covered by the plain (non-`--recompute`)
   mode. Rehydration in step 2 already writes a fresh hash for the rows it
   touched, so this pass mainly covers rows it skipped.
4. **Only then enable classification and start the workers** (steps 3 and 4 of
   the checklist above). The homepage stays thin until items are reclassified
   under the new revision, and reclassification is new Jev spend; scope it with
   the [backfill runbook](./content-moderation-backfill.md) and the readiness
   queries below.

If a worker runs before step 3, it does not spend a Jev call on an outdated
hash: a job whose hash no longer matches the state builder is marked
`superseded` with `last_error_code=source_hash_outdated`, and the resolver never
re-admits an existing job identity. Run step 3, and the resolver admits fresh
jobs under the new hashes.

## Web visibility rollout and rollback

`WEB_MODERATION_VISIBILITY_ENABLED` is read only by the Web server and defaults
to `false`. When `true`, the homepage keeps only items whose current summary is
exactly complete and safe before hero and carousel selection; explicit,
`needs_review`, unknown, pending, stale, missing, and unresolved items are all
excluded. Detail and card artwork (search, Browse, list detail, public lists and
profiles) is blurred for explicit items unless the authenticated viewer has
`allow_adult_content=true`. The preference changes artwork only; it does not
restore excluded homepage items. The flag stays server-only: the browser
receives only the resolved boolean through the root route, and search and Browse
responses carry moderation summaries only while it is on. Unknown, pending, stale, incomplete,
and `needs_review` detail summaries remain visible and unblurred. This flag
does not protect image URLs from direct access.

### Homepage readiness check

Run these read-only aggregate queries against the target database before
enabling the Web flag. Do not select content, hashes, payloads, or tokens. Use
your configured `MODERATION_MODEL` and `MODERATION_QUESTION_REVISION` values:

```sql
-- Jobs by state: a healthy queue drains; watch retry, failed, outcome_unknown.
SELECT status, count(*) AS jobs FROM content_moderation_job
WHERE requested_model = '<MODERATION_MODEL>'
  AND question_revision = '<MODERATION_QUESTION_REVISION>'
GROUP BY status ORDER BY status;

-- Judgments by outcome for the active question revision.
SELECT status, classification, count(*) AS judgments
FROM content_moderation_judgment
WHERE question_revision = '<MODERATION_QUESTION_REVISION>'
GROUP BY status, classification ORDER BY status, classification;
```

A first readiness signal is a large `done` job count and a large
`complete`/`safe_for_automatic_discovery` judgment count relative to the
homepage's roughly 30 candidates per category, with `queued` and `retry`
approaching zero. Homepage candidates rotate with the Proxy cache, so the
counts are only a proxy: also load the homepage with the Web flag still off,
which admits work for its current candidates, wait a few worker polling
intervals, and look again. Nothing here asserts the state of any deployed
environment.

After validation and a separately approved release, set the flag to `true` on
every Web instance and restart them together. To roll back, unset it or set it
to `false` on every instance, restart, then reload browser clients. The homepage
query key includes the server-resolved mode so new route loads do not reuse
results from the other mode. Core's `MODERATION_CLASSIFICATION_ENABLED` and
`WEB_MODERATION_VISIBILITY_ENABLED` remain separate; classification does not
toggle Web visibility. No deployment or production configuration change is
asserted here.

## Local Compose (explicit opt-in)

`make up` starts only the ordinary app services. Workers use the non-default
`moderation` profile, publish no ports, and depend on healthy Core (whose local
startup applies migrations) and, for metadata preparation, healthy Proxy.
Their command overrides do not run migrations and their HTTP healthchecks are
disabled. The metadata-preparation process has the Jev key explicitly blanked;
the moderation process receives Core's server-only environment.

The local `core/.env` may contain an active Jev key. Do not start either
worker merely to test Compose wiring. When a local operator explicitly
authorizes calls and has set the server-side classification flag, start the
processes in order, one service at a time:

```sh
make local-worker-start SERVICE=metadata-preparation-worker
make local-logs SERVICE=metadata-preparation-worker
# Confirm migrations and observe the aggregate preparation-job state first.
make local-worker-start SERVICE=moderation-worker
make local-logs SERVICE=moderation-worker
```

Each `local-worker-start` call launches only the named worker. Stop either
process without stopping the app:

```sh
make local-worker-stop SERVICE=moderation-worker
make local-worker-stop SERVICE=metadata-preparation-worker
```

`make down` and `make local-destroy` also include the opt-in profile when
stopping the stack, and `make status` lists both worker services.

Worker logs emit aggregate counts and duration. For a read-only state snapshot,
query only aggregate fields from the local database; do not select content,
lease tokens, or payloads:

```sql
SELECT status, count(*) AS jobs, sum(attempts) AS attempts,
       max(updated_at) AS last_updated
FROM content_metadata_preparation_job
GROUP BY status ORDER BY status;

SELECT status, count(*) AS jobs, sum(attempts) AS attempts,
       max(updated_at) AS last_updated
FROM content_moderation_job
GROUP BY status ORDER BY status;
```

Include `retry`, `failed`, and `outcome_unknown` in the review. A stopped
worker leaves durable jobs in place. Setting
`MODERATION_CLASSIFICATION_ENABLED=False` prevents new Jev classification and
leaves incremental jobs queued; stopping the moderation process prevents it
from draining jobs. These are separate rollback controls. The metadata worker
can still make Proxy metadata requests while running.

The production `JevModerationClient` constructs the TypeSafe SDK with
`RetryPolicy(max_retries=0)`. One adapter `classify()` call therefore permits
at most one SDK wire attempt; worker job retry and reconciliation behavior is
separate. This is not a global Jev request or cost limit.

## Production setup gate

No worker deployment manifest or live Dokploy verification is available in
this repository. Before the first production worker starts, the operator must
create and review the external process configuration: exact Core image and
command, server-only environment, one replica per worker, database/proxy
connectivity, migration-before-worker ordering, HTTP-healthcheck override,
logs/alerts, bounded restart policy, and stop/rollback procedure. This guide
does not authorize inspecting or changing the live platform, starting a worker,
calling Jev, or running a production backfill.

## Production deployment

Production runs two Dokploy applications from the Core image
(`ghcr.io/codeyee/denn-core:latest`): `denn-moderation-worker`
(`python manage.py run_moderation_worker`) and `denn-metadata-worker`
(`python manage.py run_metadata_preparation_worker`). Each has one replica, no
domain, the image HTTP healthcheck disabled (`{"Test": ["NONE"]}`) and a
60-second stop grace period. The command override skips the image entrypoint,
so workers never migrate. Their environment is a copy of Core's; the metadata
worker omits `TYPESAFE_API_KEY`.

`deploy-core.yml` redeploys both workers only after a verified Core release.
It calls Core's webhook, then polls the public, unauthenticated
`GET /api/version/` (`CORE_PUBLIC_URL`, default
`https://denn-api.codeyee.dev`) for up to 10 minutes until its `sha` equals the
pushed commit. The image entrypoint starts gunicorn only after
`migrate --noinput` succeeds, so a matching sha proves the migrations ran. Then
it calls `MODERATION_WORKER_DEPLOY_WEBHOOK` and
`METADATA_WORKER_DEPLOY_WEBHOOK` independently: a failure of one does not skip
the other, and an unset webhook secret emits a workflow warning instead of a
silent skip.

If Core never reports the new sha (failed deploy or migration), the job fails
and the worker steps do not run: both workers stay on the previous release.
After fixing Core, redeploy the workers manually from Dokploy.
Environment changes in Dokploy only apply after a redeploy of that
application.
