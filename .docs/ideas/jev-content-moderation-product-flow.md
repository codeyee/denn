# Jev Content Moderation Product Flow

**Status:** Verified current-state notes and an unratified architecture recommendation. This is not an approved design or release authorization. **Last verified:** 2026-09-23.

This note separates implementation evidence, the requested product outcome, a recommended flow, and choices that remain open. It does not authorize an admin implementation, a production deploy, a production backfill, or enforcement.

## Current implementation (verified)

| Area | Current behavior |
| --- | --- |
| Classification | Jev currently runs only through the explicit manual Core backfill command. It is not called from full-detail ingestion. |
| Core detail | A detail fetch can hydrate and persist normalized full metadata before returning. That path does not currently run Jev. |
| Homepage | Proxy aggregates and caches provider suggestions with a 5-minute fresh and 30-minute stale window. Web SSR and its same-origin homepage BFF call the shared Core bulk resolver, then remove only current `complete`/`explicit` items before the banner and carousels consume the response. `needs_review`, pending, stale, missing, malformed, and unresolved items remain visible; order is preserved. |
| Moderation summary | Core's bulk resolver returns the public `{status, classification}` summary using its current-source hash. Web does not trust a bare `complete` status: it suppresses only the exact `complete` + `explicit` pair. |
| Adult preference | The preference affects direct search. It does not make homepage inclusion safe and does not hide direct detail. Existing provider-owned filtering remains documented in [content eligibility](../architecture/content-eligibility.md). |
| Development preview | `/dev/moderation-preview` is registered in the production route graph. Its `beforeLoad` calls `notFound()` when `import.meta.env.DEV` is false, which hides it at runtime but does not exclude it from the route graph or built artifact. The production build emitted both client and server route chunks. Remove or exclude it before release; this has not been done. See `web/src/routes/dev.moderation-preview.tsx`. |
| Production state | No production moderation deploy, backfill, or enforcement has occurred. The code-level homepage behavior is not deployment evidence. |

The preview applies artwork blur only to a `complete` judgment classified as `explicit`. Missing, pending, stale, errored, malformed, and `needs_review` summaries are not treated as safe. The blur is a presentation control, not access control for the underlying image.

## Requested product outcome and implementation state

- Classify new content close to full-detail ingestion and reuse its judgment across surfaces rather than classifying separately for each view.
- Blur explicit artwork by default on detail pages and let the user reveal it. The request does not ask to block direct detail access.
- [x] Exclude currently classified explicit content from homepage suggestions before selecting the featured banner and carousels. This Web slice uses Core's one-call bulk response; uncertain, stale, missing, malformed, and unresolved results remain visible with any stored status intact.
- Run a bounded batch for initial legacy coverage and provide a human-review path for `needs_review` items.
- Later, provide a simple authenticated `/admin` surface to view content, start classification, find `needs_review` items, and submit a manual classification.
- Do not implement the admin surface now. Do not create an issue or run a production rollout as part of this work.

## Recommended flow (proposal only; not user-approved)

1. Persist or refresh the normalized full-detail record first.
2. After the metadata transaction commits, enqueue or coalesce a bounded classification job keyed by content identity and source hash. Classification failure must not fail detail ingestion.
3. Persist the versioned judgment and make freshness explicit by comparing its source hash with the currently reconstructed moderation input.
4. Return detail without waiting on an unbounded Jev request. While the current judgment is pending or unusable, prefer an image-free placeholder over exposing unclassified artwork; decide the exact pending presentation below.
5. Before composing homepage banners and carousels, resolve moderation summaries for candidate IDs in one bounded batch and remove only current explicit judgments. The Web path now implements this step for SSR and its BFF response. Core computes source freshness on each resolution; Proxy's 5-minute fresh/30-minute stale candidate cache and the Web query's 5-minute `staleTime` still mean an already hydrated browser response is not immediately invalidated when a judgment changes.
6. Run initial legacy classification as a separate, resumable, rate-bounded job after deployment. Never run a catalog backfill during application startup.
7. Keep future admin actions behind an explicit authenticated role and record who started a job or submitted a manual result, what content/judgment version it affected, and when.

This direction fits the existing split: Proxy owns provider calls and its homepage cache, Web fetches and presents the homepage, and Core owns normalized content and persisted judgments. The existing [provider metadata idea](./jev-provider-metadata-for-content-moderation.md) remains a separate future scope; this recommendation uses metadata already persisted by Core.

## Decisions still open

| Decision | Why it remains open |
| --- | --- |
| Pending detail behavior | Choose whether detail remains available while classification is pending and whether the image-free placeholder is required, or whether another safe presentation is preferred. Blocking the public detail response on Jev latency is not recommended, but the product behavior is not ratified. |
| `needs_review` on non-homepage surfaces | The homepage rule now explicitly leaves `needs_review` visible as requested. Behavior for other discovery and detail surfaces remains outside this slice. |
| Reclassification and rehydration | Core identifies stale summaries against the current-source hash during bulk resolution, but when to schedule reclassification is open. Web does not immediately invalidate the 5-minute client cache when a judgment changes. |
| Classification worker | Choose the queue/worker or equivalent execution mechanism, coalescing and retry behavior, and rate/cost bounds. The current detail path is synchronous and the manual command is not an ingestion scheduler. |
| Admin authority and manual classification | Choose the authentication role, permitted actions, whether an admin may override a model judgment or only request a new run, and required audit fields. |
| Rollout and release gates | Define the measured evaluation and enforcement criteria, batch bounds, and operational rollback before production rollout. The preview route must also be removed/excluded from the production artifact before release. |

These notes do not authorize a production deploy, ingestion-time Jev call, or production backfill. The homepage source path filters current explicit judgments only; other unresolved product and operational choices remain unimplemented.
