# Public Profile And Tracking Backfill

Use this runbook after deploying the additive public-profile/tracking
migrations and before treating public counters as complete.

## Preconditions

1. Deploy the matching `core` code.
2. Run Django migrations.
3. Confirm a current database backup and normal database health.
4. Run from one application instance so the report is easy to audit.

## Audit

Run the command without writes:

```bash
cd core
python manage.py backfill_public_profiles_tracking --dry-run
```

The command emits one JSON object. Review:

- `username_anomalies`
- `username_case_collisions`
- `content_duplicates`
- `rating_duplicates`
- `metadata_missing`
- `seasons_without_parent`
- `shared_completed_rows_omitted`
- projected profile, season-parent, and tracking counts

Do not rename legacy users automatically. Resolve duplicates and missing
season parents deliberately if they would make the applied result
ambiguous.

## Apply

```bash
cd core
python manage.py backfill_public_profiles_tracking --apply
```

The command runs in one transaction. A failure rolls back the run.
Completed shared-list rows are intentionally omitted unless the same
user has their own rating.

## Verify Idempotency

Immediately repeat both modes:

```bash
python manage.py backfill_public_profiles_tracking --dry-run
python manage.py backfill_public_profiles_tracking --apply
```

On a converged dataset, the created/seeded counts are zero. Diagnostic
arrays may remain non-empty until their underlying legacy anomalies are
repaired; that does not mean the command wrote duplicate records.

Then verify:

- every user has one `UserPublicProfile`;
- ratings seeded as completed are active;
- public profile reads perform no provider calls;
- private lists return 404 to anonymous requests;
- one representative season resolves to its local TV-show parent.

## Recovery

The command is additive and does not rename users or delete historical
ratings. If application behavior is wrong after apply, stop the rollout
and restore from the pre-run database backup. Do not attempt to infer a
reverse migration from shared-list rows or unresolved season parents.
