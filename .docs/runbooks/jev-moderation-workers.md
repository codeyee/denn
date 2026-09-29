# Jev moderation worker operations

This guide covers the two supervised Core workers. They are opt-in local
processes and are not part of ordinary app startup. Neither worker performs a
catalog backfill. The initial production setup remains blocked on an approved
external process manifest; this repository has no checked-in Dokploy worker
manifest, and no live platform state is asserted here.

## Safe rollout sequence

1. **Apply schema first.** Deploy the normal Core release and wait for its
   migration step and `/api/` healthcheck to succeed. The production Core
   entrypoint migrates before Gunicorn. A command-overridden worker must not
   migrate independently; disable or replace the inherited HTTP `/api/`
   container healthcheck because a worker does not serve HTTP.
2. **Configure server-only settings.** Set `TYPESAFE_API_KEY` only in Core's
   server environment. Enable `MODERATION_CLASSIFICATION_ENABLED` only for the
   approved collection window. `MODERATION_POLICY_MODE` has no current runtime
   consumer and does not control Web presentation. Keep Web visibility off by
   leaving `WEB_MODERATION_VISIBILITY_ENABLED` unset or `false`; never expose
   the Jev key to Web or browser settings.
3. **Start one metadata-preparation worker.** It calls Proxy for queued
   identity-only records; normalized detail writes may enqueue moderation jobs
   when classification is enabled. It does not call Jev or scan the catalog.
4. **Observe before proceeding.** Check aggregate job states, retries, attempt
   counts, duration and bounded error codes. Reconcile `outcome_unknown`
   manually before any retry. Do not use content payloads or credentials in
   logs or reports.
5. **Start one moderation worker.** It drains only queued/retry outbox jobs.
   Keep one replica of each worker until target-environment PostgreSQL
   concurrency and persistence fencing have been verified. Per-process batch
   and polling limits are not a global Jev rate or cost limit.
6. **Backfill existing rows separately.** The incremental worker does not
   classify existing catalog rows. Use the bounded, resumable
   [`content moderation backfill`](./content-moderation-backfill.md) only
   after explicit authorization for the exact environment, flags, selection,
   item cap, report path and estimated cost. Start with a small sample; record
   report tokens, duration, estimated cost and bounded error IDs. Never infer
   authorization from `--confirm-live`.
7. **Keep visible enforcement off until separately approved and validated.**
   Core classification enablement does not activate the Web visibility gate.
   No admin panel or production worker deployment is included in this change.
   Do not infer production state from repository configuration.

## Web visibility rollout and rollback

`WEB_MODERATION_VISIBILITY_ENABLED` is read only by the Web server and defaults
to `false`. When `true`, the homepage removes only current complete explicit
items before hero and carousel selection. Detail artwork is blurred for explicit
items unless the authenticated viewer has `allow_adult_content=true`. The
preference changes detail artwork only; it does not restore suppressed homepage
items. Unknown, pending, stale, incomplete, and `needs_review` summaries remain
visible. This flag does not protect image URLs from direct access.

After validation and a separately approved release, set the flag to `true` on
every Web instance and restart them together. To roll back, unset it or set it
to `false` on every instance, restart, then reload browser clients. The homepage
query key includes the server-resolved mode so new route loads do not reuse
results from the other mode. Core's `MODERATION_CLASSIFICATION_ENABLED` and
`MODERATION_POLICY_MODE` remain separate; neither toggles Web visibility. No
deployment or production configuration change is asserted here.

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
