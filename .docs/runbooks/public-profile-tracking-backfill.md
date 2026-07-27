# Public Profile And Tracking Backfill

Use this runbook after deploying the unified personal-progress migration
and before treating public progress, ratings, or favorites as complete.

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
- `historical_season_parent_rating_ambiguity`
- `direct_season_ratings`
- `direct_season_tracking`
- projected profile, parent-link, rating-normalization, tracking-seed,
  and personal-context cleanup counts
- `tracking_seeded_from_personal_lists_as_completed`
- `tracking_seeded_from_personal_lists_as_backlog`

Do not rename legacy users automatically. Resolve duplicates and missing
season parents deliberately. A missing parent does not prevent direct
season tracking; it only limits contextual navigation back to the series.
Historical ratings already stored on a parent show cannot be attributed
to a particular season from the current schema, so the command reports
that ambiguity and never guesses.

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

On a converged dataset, the created/seeded/normalized/cleared counts are
zero. Diagnostic
arrays may remain non-empty until their underlying legacy anomalies are
repaired; that does not mean the command wrote duplicate records.

Then verify:

- every user has one `UserPublicProfile`;
- every active rating has direct `completed` tracking for the same
  `ContentItem`;
- every content item in a personal list has one tracking row for the owner;
- personal-list content without prior progress was seeded as `backlog`;
- personal-list rows have null `context_status` and
  `context_completed_at`;
- shared-list contextual state remains unchanged;
- public profile reads perform no provider calls;
- private lists return 404 to anonymous requests;
- a representative persisted season has its own Denn id, direct tracking,
  and—when locally resolvable—a TV-show parent link.

## Recovery

The command does not rename users, delete historical ratings, or infer a
season from a parent-show rating. It does clear deprecated personal-list
context only after seeding canonical tracking. If application behavior is
wrong after apply, stop the rollout and restore from the pre-run database
backup; do not infer a reverse migration from shared-list rows or
unresolved season parents.
