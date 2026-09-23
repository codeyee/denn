# Content moderation backfill (observe-only operator guide)

The moderation backfill classifies existing catalog items with Jev and persists
versioned judgments. This runbook shows how to SEE that work. It does not run
the backfill: every live form costs real API calls and needs explicit
authorization first.

The backfill is a separate, manual path for existing rows. It does not start
or drain the incremental moderation outbox or the homepage metadata-preparation
queue. Their bounded Core worker commands are separate processes; this repo
does not establish that they are wired into or running in production. Source
code and local checks are not production deployment evidence.

The worker batch and polling limits are per process, not a global provider-call
rate cap. Until multi-instance concurrency and persistence fencing are
validated, any first rollout should run one instance of each worker. No
aggregate rate/cost limit across replicas is implemented or evidenced here.

## Quick path (safe, no API calls)

1. Read the command contract without executing it:
   `python core/manage.py backfill_content_moderation --help`
2. Run the offline test suite instead of the command (proves the accounting
   without spending anything).
3. Inspect a past run's JSONL output or `--report` file with the `jq`
   examples below.

## Prerequisites (names only, never values)

| Name | Purpose |
|------|---------|
| `TYPESAFE_API_KEY` | Server-side Jev credential; never reaches the browser |
| `MODERATION_CLASSIFICATION_ENABLED` | Master switch; the service makes no calls while false |
| `MODERATION_POLICY_MODE` | Core configuration value; it has no current runtime consumer and does not gate Web visibility |
| `WEB_MODERATION_VISIBILITY_ENABLED` | Separate Web server flag for homepage explicit suppression and detail-artwork blur; defaults off |
| `MODERATION_MODEL` | Requested model or alias (for example `jev-latest`) |
| `MODERATION_QUESTION_REVISION` | Pins which question wording produced a judgment |

## Fail-closed preflight

`--help` shows every option. The command refuses to do anything unless BOTH
of these are present:

- `--confirm-live` — explicit opt-in flag for this exact invocation.
- `--limit N` with N positive — exact item cap. There is no unbounded mode.

Missing either one is a `CommandError` before any ORM query or classifier
call. Invalid numbers, unknown price overrides, invalid report destinations,
and invalid exact-ID selections also fail as `CommandError`. Exact-ID mode
checks every supplied ID with a read-only lookup before classification. Missing
IDs, duplicates, malformed or non-positive IDs, conflicting `--after-id`, and
a `--limit` smaller than the selected set fail before classifier calls or
report output. The command prints only the selected count, not a provider
payload or credential.

Before classification, the command checks that the report parent already
exists, is a directory, and is writable, and that the destination is not a
directory. It never creates a missing parent or a placeholder report. No secret
is ever printed.

The report uses a temporary file in the validated parent and an atomic rename.
A later filesystem error (for example, a path change or disk failure) can still
prevent report completion after classification; the command removes its
in-progress temporary file and never leaves a partial report.

## Bounded live form (authorized runs only)

For production, `--confirm-live` is not the production change authorization.
Obtain the required production approval for the exact environment, selected
IDs or range, item limit, and report destination before running the command.
This runbook grants no production authorization.

```bash
python core/manage.py backfill_content_moderation \
  --confirm-live --limit 5 \
  --progress-every 5 \
  --report /tmp/moderation-backfill-first-sample.json
```

Start with `--limit 5` for the first authorized sample. This incurs real API
calls and cost. Do not run it without explicit authorization. Resume a
stopped run with `--after-id <last_id from the previous summary>`.

### Exact sparse-ID selection

Use `--ids` when the operator must classify a specific sparse set. The flag
accepts one comma-separated list of unique positive ContentItem primary keys.
The command validates that every ID exists, then reports the selection count
and passes only those IDs through the normal ordered, bounded runner. `--limit`
must remain positive and must be at least the number of IDs. Set it to that
count for a clear safety cap. `--ids` cannot be combined with `--after-id`;
resume cursors apply only to range mode.

```bash
python core/manage.py backfill_content_moderation \
  --confirm-live --ids 1387,1947,1952 --limit 3 \
  --progress-every 3 \
  --report /tmp/moderation-backfill-selected.json
```

This is a live Jev operation and can incur real API cost. The exact-ID check
only constrains which existing rows the command can classify; it does not
verify that the IDs are the correct production records or make a run safe to
execute without the required production change approval. Review the target
environment, ID list, flags, and report destination before an authorized run.
Never run this example against production without that approval.

## Output: JSONL events, then one summary

Stdout carries one compact JSON object per line:

| `event` | Meaning |
|---------|---------|
| `selection` | Exact-ID mode preflight count; it does not reveal provider payloads or secrets |
| `item` | One attempted item: `outcome`, `classification`, `model_name`, `reused`, current-call `usage`, `code`, `duration_ms` |
| `progress` | Periodic aggregate every `--progress-every` items |
| `final_summary` | Complete run accounting (also the `--report` content) |

`--report PATH` writes that same summary atomically (temp file plus rename;
the temp file is removed on failure).

## Reading the summary

| Field | Meaning |
|-------|---------|
| `selection` | Exact-ID mode and validated selection count; omitted in range mode |
| `scanned` / `last_id` | Items attempted; resume cursor for the next run |
| `created` vs `reused` | New judgments vs collapsed onto an existing identical row |
| `provider_override` | TMDB adult-flag short-circuits (no Jev call, no usage) |
| `skipped` / `unavailable` / `error` | Disabled-or-stateless / typed Jev failure / unexpected exception (run continues) |
| `buckets` | `safe_for_automatic_discovery`, `explicit_or_sensitive`, `needs_review`, `unknown` |
| `input_tokens` / `output_tokens` | Attributable totals from real calls only |
| `missing_usage` | Real calls that returned no token counts (distinguish from no-call paths, which never increment it) |
| `duration_seconds` / `throughput_items_per_second` | Wall clock and rate |
| `estimated_cost_usd` / `pricing_snapshot` | Estimate with source URL, dates, and per-unit rates |
| `failed_item_ids` / `unavailable_item_ids` | Bounded retry lists plus `*_truncated_count` and `*_truncated` flags |

## `jq` examples

```bash
# Classifications in this run
jq -s 'map(select(.event == "item")) | group_by(.classification) | map({key: .[0].classification, value: length}) | from_entries' run.jsonl

# Retry candidates (bounded; check the *_truncated flags for overflow)
jq -s '[.[] | select(.event == "final_summary") | .failed_item_ids[], .unavailable_item_ids[]]' run.jsonl

# Cost, tokens, and pricing provenance
jq -s '.[] | select(.event == "final_summary") | {estimated_cost_usd, input_tokens, output_tokens, missing_usage, pricing_snapshot}' run.jsonl
```

## Shadow-mode limitation

The command observes and persists judgments; it does not itself change surface
behavior. Web visibility uses the independent, server-only
`WEB_MODERATION_VISIBILITY_ENABLED` flag. It defaults to `false`; when enabled,
Web suppresses only current complete explicit homepage items and blurs explicit
detail artwork unless the viewer has `allow_adult_content=true`. The preference
does not restore homepage items, and CSS blur does not prevent direct image
access. `MODERATION_POLICY_MODE` has no current runtime consumer and does not
control Web presentation.

Neither code presence nor this runbook is evidence that the flag is enabled in
a deployed environment. To roll back visible behavior, unset the Web flag or
set it to `false` on every Web instance and restart them; then reload clients.
The homepage query cache includes the resolved mode, so the next route load
uses the matching response. No judgment or schema data needs rollback.

## Stop, resume, rollback

- Stop: interrupt the process; already-persisted judgments are idempotent.
- Resume: rerun with `--after-id` set to the previous summary's `last_id`;
  identical identities reuse rows instead of re-calling Jev.
- Rollback: the command creates no schema or policy state, so stopping it is
  sufficient; judgment rows are ordinary versioned records.

## Pricing note

`estimated_cost_usd` is an estimate from the embedded pricing snapshot and
may differ from account or gateway billing. Audit it via `pricing_snapshot`
before quoting cost.
