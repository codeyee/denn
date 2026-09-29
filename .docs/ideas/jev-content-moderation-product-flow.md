# Jev Content Moderation Product Flow

**Status:** Partially superseded by [ADR 0009](../adr/0009-jev-content-moderation.md) (Accepted 2026-09-28). The ADR owns the decided architecture and the homepage and detail visibility rules. This note keeps background and the decisions that are still open. It is not release authorization. **Last verified:** 2026-09-23; reconciled with ADR 0009 on 2026-09-28.

This note separates implementation evidence, the requested product outcome, a recommended flow, and choices that remain open. It does not authorize an admin implementation, a production deploy, a production backfill, or enforcement.

## Current implementation (verified)

| Area | Current behavior |
| --- | --- |
| Classification | The explicit Core backfill command remains separate and manual for existing catalog rows. Normalized-detail writes can enqueue incremental moderation outbox work, and a bounded Core management-command worker can process it. No worker process wiring or production deployment is established here; detail requests do not wait for a Jev call. |
| Core detail and freshness | Core materializes the current moderation-source hash with normalized detail writes. Its summary and bulk resolver compare the latest judgment with that hash, so changed source text is stale rather than current. While classification is enabled, identity resolution enqueues a separate metadata-preparation job when normalized detail or its current hash is absent, and one deduplicated moderation job when detail and hash exist but no current judgment does. |
| Homepage | Proxy aggregates and caches provider suggestions with a 5-minute fresh and 30-minute stale window. Web SSR and its same-origin homepage BFF call the shared Core bulk resolver, then keep only items whose current summary is exactly `complete`/`safe` before the featured banner and carousels are selected. Explicit, `needs_review`, pending, stale, missing, error, malformed, and unresolved items are excluded; order is preserved. Per [ADR 0009](../adr/0009-jev-content-moderation.md), the strict homepage is a maintainer decision that supersedes the earlier show-unclassified choice. |
| Worker processes | Both the Core moderation-outbox worker and homepage metadata-preparation worker are implemented as bounded management commands. The repository does not establish deployment/supervision wiring for either process; code presence is not evidence that either worker is running. Start with one instance per worker: the per-process bounds are not a global provider-call cap, and multi-instance concurrency/persistence fencing has not been verified. |
| Adult preference | The existing `allow_adult_content` preference affects direct search and detail artwork. On detail, current explicit artwork blurs for anonymous, false, or missing preference values; true displays it. Homepage remains independent of this preference. Existing provider-owned filtering remains documented in [content eligibility](../architecture/content-eligibility.md). |
| Development preview | `/dev/moderation-preview` is excluded from the production route graph by the production Vite configuration; its imported artwork is not emitted either. A development-only `notFound()` guard remains as defense in depth. The recorded production build check found no preview route or artwork in output. See `web/vite.config.ts` and `web/src/routes/dev.moderation-preview.tsx`. |
| Production state | No production moderation deploy, backfill, or enforcement has occurred. The code-level homepage behavior is not deployment evidence. |

The preview applies artwork blur only to a fresh `complete` judgment classified as `explicit` when the viewer has not opted in through the existing preference. Missing, pending, stale, errored, malformed, and `needs_review` summaries are not treated as safe. The blur is a presentation control, not access control for the underlying image.

## Requested product outcome and implementation state

- Classify new content close to full-detail ingestion and reuse its judgment across surfaces rather than classifying separately for each view.
- Blur explicit artwork by default on detail pages and let the user reveal it. The request does not ask to block direct detail access.
- Detail pages use the existing `allow_adult_content` account preference: anonymous, false, or missing values blur only current `complete`/`explicit` banner, gallery, and episode artwork; true displays it normally. Local reveal never changes the saved preference. Unknown and non-explicit moderation statuses remain visible and unblurred.
- [x] Show only currently classified-safe content on the homepage: exclude every other status before selecting the featured banner and carousels. This Web slice uses Core's one-call bulk response, and the resolver admits the missing preparation and classification work so the homepage heals itself.
- Run a bounded batch for initial legacy coverage and provide a human-review path for `needs_review` items.
- Later, provide a simple authenticated `/admin` surface to view content, start classification, find `needs_review` items, and submit a manual classification.
- Do not implement the admin surface now. Do not create an issue or run a production rollout as part of this work.

## Recommended flow (background; the decided parts are in ADR 0009)

1. Persist or refresh the normalized full-detail record first.
2. After the metadata transaction commits, enqueue or coalesce a bounded classification job keyed by content identity and source hash. This Core outbox path and its worker command are implemented; the worker process is not wired into deployment, and classification failure must not fail detail ingestion.
3. Persist the versioned judgment and make freshness explicit by comparing it with Core's materialized current source hash. The source-hash materialization, summary, and bounded bulk resolver are implemented.
4. Return detail without waiting on a Jev request. While the current judgment is pending or unusable, detail stays available and its artwork is not blurred; there is no placeholder in v1 (decided in ADR 0009).
5. Before composing homepage banners and carousels, resolve moderation summaries for candidate IDs in one bounded batch and keep only fresh safe judgments. The Web path implements this step for SSR and its BFF response. Core compares against its materialized current source hash; Proxy's 5-minute fresh/30-minute stale candidate cache and the Web query's 5-minute `staleTime` still mean an already hydrated browser response is not immediately invalidated when a judgment changes. Explicit, unknown, pending, stale, missing, malformed, and `needs_review` items are excluded by product decision (ADR 0009); the same resolver call admits preparation and classification work for candidates that lack it.
6. Run initial legacy classification as a separate, resumable, rate-bounded manual operation. The backfill command does not enqueue or share execution with the incremental worker, and no production backfill or worker deployment is evidenced. Never run a catalog backfill during application startup.
7. Keep future admin actions behind an explicit authenticated role and record who started a job or submitted a manual result, what content/judgment version it affected, and when.

This direction fits the existing split: Proxy owns provider calls and its homepage cache, Web fetches and presents the homepage, and Core owns normalized content and persisted judgments. The existing [provider metadata idea](./jev-provider-metadata-for-content-moderation.md) remains a separate future scope; this recommendation uses metadata already persisted by Core.

## Decision status

| Decision | Status |
| --- | --- |
| Homepage items without a fresh usable moderation result | **Decided** (maintainer, 2026-09, revised; [ADR 0009](../adr/0009-jev-content-moderation.md)): the homepage is strict and shows only current `complete`/`safe` items. Explicit, `needs_review`, unknown, pending, stale, missing, error, malformed, and unresolved items are excluded. This supersedes the earlier show-unclassified choice. |
| Pending detail behavior | **Decided** (same ADR): detail stays available and unblurred while classification is pending or unusable. There is no placeholder in v1, and the public detail response never waits on Jev. |
| `needs_review` on non-homepage surfaces | Open. The strict homepage excludes `needs_review`; the detail-artwork rule leaves it visible and unblurred. Search, Browse, list annotations, and other non-detail surfaces remain outside the current behavior. |
| Reclassification cadence | Open. Core identifies stale summaries against the current-source hash during bulk resolution, but when to schedule reclassification is undecided. Web does not immediately invalidate the 5-minute client cache when a judgment changes. |
| Worker operations ownership | Open. The [worker runbook](../runbooks/jev-moderation-workers.md) defines the activation checklist, but the owner, supervision wiring, and rate/cost bounds still need a decision. Run one instance per worker; per-process bounds do not cap aggregate provider traffic. |
| Admin authority and manual classification | Open ([#113](https://github.com/codeyee/denn/issues/113)). Choose the authentication role, permitted actions, whether an admin may override a model judgment or only request a new run, and required audit fields. |
| Release gates | Evaluated. The 2026-09-28 catalog evaluation recommends GO with the default thresholds (see the [evaluation runbook](../runbooks/jev-moderation-evaluation.md#results-2026-09-28-catalog-evaluation)); the maintainer approves activation, and backfill batch bounds remain an activation-time choice. Keep the production-build exclusion check for the preview route and asset as a release verification item. |

These notes do not authorize a production deploy, a production worker process, or a production backfill.
