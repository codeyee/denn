# Homepage Metadata Preparation

This worker prepares normalized detail for identity-only content admitted by
`POST /api/content/resolve-ids/`. It is separate from request handling and from
the Jev moderation worker.

## Safety and scope

- The resolver only records bounded intent. It does not call Proxy or Jev.
- This command processes queued preparation jobs only. It does not scan old
  `ContentItem` rows, backfill legacy detail, or alter moderation policy.
- Jobs with existing type-specific detail finish without a Proxy request.
- Missing detail is fetched through Core's `source_data_orchestrator`, then
  written by its normalized detail mapper. That path maintains the current
  moderation source hash and enqueues moderation work when classification is
  enabled.
- Claims use short PostgreSQL row-lock transactions with `skip_locked`; no
  network request runs while a claim lock is held. Lease tokens fence stale
  completions. GET failures retry with bounded exponential backoff and end in
  `failed` after the configured attempt limit.
- Batch size is limited to 100 (default 10). Leases are at least 300 seconds,
  longer than the configured per-request Proxy timeouts. The producer separately caps
  active queued/leased/retry jobs at 1,000. No provider payload, exception
  text, credential, or external identifier is written to worker summaries.
- A saturated producer may leave candidate identities without a job. Resolve
  those identities again after capacity returns; there is no automatic scan.

## Run

Use the Core environment configured for this worktree. Start with one small
batch and inspect aggregate output:

```sh
cd core
python manage.py run_metadata_preparation_worker --once --batch-size 10
```

For a continuously supervised process, use bounded poll and retry settings:

```sh
python manage.py run_metadata_preparation_worker \
  --batch-size 10 --poll-interval 5 --lease-seconds 300 \
  --max-attempts 5 --base-backoff 5 --max-backoff 900
```

SIGINT and SIGTERM stop after the current batch. The command emits one
aggregate `counts` and `duration_ms` line per poll. Run only one supervised
instance until deployment concurrency and PostgreSQL `skip_locked` behavior
have been verified in the target environment.

## Outcomes

- `done`: detail already existed, or canonical metadata was fetched and
  normalized successfully.
- `retry`: no usable detail was persisted; retry is scheduled with bounded
  backoff.
- `failed`: retry limit reached.
- `fenced`: another valid lease replaced this worker's token before its state
  transition. The stale worker cannot mark the replacement lease complete.
- `lease_expired_retry`: a previous lease expired and was safely made eligible
  for another bounded metadata GET.

Inspect job status using an authorized operator database workflow. Do not
manually edit lease tokens or silently reset terminal jobs. No production
deployment, legacy backfill, or provider call is implied by this runbook.
