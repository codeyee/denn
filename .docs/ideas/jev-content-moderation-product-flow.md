# Jev Content Moderation Product Flow

**Status:** Verified current-state notes and an unratified architecture recommendation. This is not an approved design or release authorization. **Last verified:** 2026-09-23.

This note separates implementation evidence, the requested product outcome, a recommended flow, and choices that remain open. It does not authorize an admin implementation, a production deploy, a production backfill, or enforcement.

## Current implementation (verified)

| Area | Current behavior |
| --- | --- |
| Classification | The explicit Core backfill command remains separate and manual for existing catalog rows. Normalized-detail writes can enqueue incremental moderation outbox work, and a bounded Core management-command worker can process it. No worker process wiring or production deployment is established here; detail requests do not wait for a Jev call. |
| Core detail and freshness | Core materializes the current moderation-source hash with normalized detail writes. Its summary and bulk resolver compare the latest judgment with that hash, so changed source text is stale rather than current. Identity resolution can enqueue a separate metadata-preparation job when normalized detail is absent. |
| Homepage | Proxy aggregates and caches provider suggestions with a 5-minute fresh and 30-minute stale window. Web SSR and its same-origin homepage BFF call the shared Core bulk resolver, then remove only fresh `complete`/`explicit` items before the featured banner and carousels are selected. `needs_review`, pending, stale, missing, malformed, and unresolved items remain visible; order is preserved. The existing code does not decide whether unavailable moderation should instead hide those items. |
| Worker processes | Both the Core moderation-outbox worker and homepage metadata-preparation worker are implemented as bounded management commands. The repository does not establish deployment/supervision wiring for either process; code presence is not evidence that either worker is running. Start with one instance per worker: the per-process bounds are not a global provider-call cap, and multi-instance concurrency/persistence fencing has not been verified. |
| Adult preference | The existing `allow_adult_content` preference affects direct search and detail artwork. On detail, current explicit artwork blurs for anonymous, false, or missing preference values; true displays it. Homepage remains independent of this preference. Existing provider-owned filtering remains documented in [content eligibility](../architecture/content-eligibility.md). |
| Development preview | `/dev/moderation-preview` is excluded from the production route graph by the production Vite configuration; its imported artwork is not emitted either. A development-only `notFound()` guard remains as defense in depth. The recorded production build check found no preview route or artwork in output. See `web/vite.config.ts` and `web/src/routes/dev.moderation-preview.tsx`. |
| Production state | No production moderation deploy, backfill, or enforcement has occurred. The code-level homepage behavior is not deployment evidence. |

The preview applies artwork blur only to a fresh `complete` judgment classified as `explicit` when the viewer has not opted in through the existing preference. Missing, pending, stale, errored, malformed, and `needs_review` summaries are not treated as safe. The blur is a presentation control, not access control for the underlying image.

## Requested product outcome and implementation state

- Classify new content close to full-detail ingestion and reuse its judgment across surfaces rather than classifying separately for each view.
- Blur explicit artwork by default on detail pages and let the user reveal it. The request does not ask to block direct detail access.
- Detail pages use the existing `allow_adult_content` account preference: anonymous, false, or missing values blur only current `complete`/`explicit` banner, gallery, and episode artwork; true displays it normally. Local reveal never changes the saved preference. Unknown and non-explicit moderation statuses remain visible and unblurred.
- [x] Exclude currently classified explicit content from homepage suggestions before selecting the featured banner and carousels. This Web slice uses Core's one-call bulk response; uncertain, stale, missing, malformed, and unresolved results remain visible with any stored status intact.
- Run a bounded batch for initial legacy coverage and provide a human-review path for `needs_review` items.
- Later, provide a simple authenticated `/admin` surface to view content, start classification, find `needs_review` items, and submit a manual classification.
- Do not implement the admin surface now. Do not create an issue or run a production rollout as part of this work.

## Recommended flow (proposal only; not user-approved)

1. Persist or refresh the normalized full-detail record first.
2. After the metadata transaction commits, enqueue or coalesce a bounded classification job keyed by content identity and source hash. This Core outbox path and its worker command are implemented; the worker process is not wired into deployment, and classification failure must not fail detail ingestion.
3. Persist the versioned judgment and make freshness explicit by comparing it with Core's materialized current source hash. The source-hash materialization, summary, and bounded bulk resolver are implemented.
4. Return detail without waiting on an unbounded Jev request. While the current judgment is pending or unusable, prefer an image-free placeholder over exposing unclassified artwork; decide the exact pending presentation below.
5. Before composing homepage banners and carousels, resolve moderation summaries for candidate IDs in one bounded batch and remove only fresh explicit judgments. The Web path implements this step for SSR and its BFF response. Core compares against its materialized current source hash; Proxy's 5-minute fresh/30-minute stale candidate cache and the Web query's 5-minute `staleTime` still mean an already hydrated browser response is not immediately invalidated when a judgment changes. Unknown, pending, stale, missing, malformed, and `needs_review` items currently remain visible; choosing a different visibility policy is still a product decision.
6. Run initial legacy classification as a separate, resumable, rate-bounded manual operation. The backfill command does not enqueue or share execution with the incremental worker, and no production backfill or worker deployment is evidenced. Never run a catalog backfill during application startup.
7. Keep future admin actions behind an explicit authenticated role and record who started a job or submitted a manual result, what content/judgment version it affected, and when.

This direction fits the existing split: Proxy owns provider calls and its homepage cache, Web fetches and presents the homepage, and Core owns normalized content and persisted judgments. The existing [provider metadata idea](./jev-provider-metadata-for-content-moderation.md) remains a separate future scope; this recommendation uses metadata already persisted by Core.

## Decisions still open

| Decision | Why it remains open |
| --- | --- |
| Homepage items without a fresh usable moderation result | Current code leaves unknown, pending, stale, missing, malformed, and `needs_review` items visible, but the product has not decided whether unavailable moderation should instead hide them. Do not infer that policy from the explicit-only filter. |
| Pending detail behavior | Choose whether detail remains available while classification is pending and whether the image-free placeholder is required, or whether another safe presentation is preferred. Blocking the public detail response on Jev latency is not recommended, but the product behavior is not ratified. |
| `needs_review` on non-homepage surfaces | The homepage and detail-artwork rules leave `needs_review` visible and unblurred. Search, Browse, list annotations, and other non-detail surfaces remain outside this slice. |
| Reclassification and rehydration | Core identifies stale summaries against the current-source hash during bulk resolution, but when to schedule reclassification is open. Web does not immediately invalidate the 5-minute client cache when a judgment changes. |
| Worker operation | Core outbox and metadata-preparation queues plus bounded worker commands now exist. Choose deployment/supervision wiring, worker enablement, rate/cost bounds, and operational ownership before relying on either worker in production. First rollout should use one instance per worker; multi-instance concurrency and persistence fencing need stronger validation, and per-process bounds do not cap aggregate provider traffic. The manual backfill remains separate. |
| Admin authority and manual classification | Choose the authentication role, permitted actions, whether an admin may override a model judgment or only request a new run, and required audit fields. |
| Rollout and release gates | Define the measured evaluation and enforcement criteria, batch bounds, and operational rollback before production rollout. Keep the production-build exclusion check for the preview route and asset as a release verification item. |

These notes do not authorize a production deploy, a production worker process, or a production backfill. The homepage source path filters only fresh explicit judgments; other unresolved product and operational choices remain open.
