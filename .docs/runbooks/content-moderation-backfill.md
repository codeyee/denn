# Content moderation backfill (observe-only operator guide)

The moderation backfill classifies existing catalog items with Jev and persists
versioned judgments. This runbook shows how to SEE that work. It does not run
the backfill: every live form costs real API calls and needs explicit
authorization first.

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
| `MODERATION_POLICY_MODE` | `shadow` collects judgments without visible enforcement |
| `MODERATION_MODEL` | Requested model or alias (for example `jev-latest`) |
| `MODERATION_QUESTION_REVISION` | Pins which question wording produced a judgment |

## Fail-closed preflight

`--help` shows every option. The command refuses to do anything unless BOTH
of these are present:

- `--confirm-live` — explicit opt-in flag for this exact invocation.
- `--limit N` with N positive — exact item cap. There is no unbounded mode.

Missing either one is a `CommandError` before any ORM query or classifier
call. Invalid numbers, unknown price overrides, and missing report
directories also fail as `CommandError`, and no secret is ever printed.

## Bounded live form (authorized runs only)

```bash
python core/manage.py backfill_content_moderation \
  --confirm-live --limit 5 \
  --progress-every 5 \
  --report /tmp/moderation-backfill-first-sample.json
```

Start with `--limit 5` for the first authorized sample. This incurs real API
calls and cost. Do not run it without explicit authorization. Resume a
stopped run with `--after-id <last_id from the previous summary>`.

## Output: JSONL events, then one summary

Stdout carries one compact JSON object per line:

| `event` | Meaning |
|---------|---------|
| `item` | One attempted item: `outcome`, `classification`, `model_name`, `reused`, current-call `usage`, `code`, `duration_ms` |
| `progress` | Periodic aggregate every `--progress-every` items |
| `final_summary` | Complete run accounting (also the `--report` content) |

`--report PATH` writes that same summary atomically (temp file plus rename;
the temp file is removed on failure).

## Reading the summary

| Field | Meaning |
|-------|---------|
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

This pipeline observes and persists judgments only. It does not hide, blur,
or suppress homepage, search, list, or detail surfaces: enforcement stays
disabled until the measured go/no-go criteria are accepted.

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
