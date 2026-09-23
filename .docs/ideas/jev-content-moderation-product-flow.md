# Jev Content Moderation Product Flow

**Status:** Verified current-state notes and an unratified architecture recommendation. This is not an approved design or release authorization. **Last verified:** 2026-09-22.

This note separates implementation evidence, the requested product outcome, a recommended flow, and choices that remain open. It does not authorize an admin implementation, a production deploy, a production backfill, or enforcement.

## Current implementation (verified)

| Area | Current behavior |
| --- | --- |
| Classification | Jev currently runs only through the explicit manual Core backfill command. It is not called from full-detail ingestion. |
| Core detail | A detail fetch can hydrate and persist normalized full metadata before returning. That path does not currently run Jev. |
| Homepage | Proxy aggregates and caches the provider homepage response with a 5-minute fresh and 30-minute stale window. Web fetches that response and Core bulk-resolves content identities; this flow does not currently use Jev moderation to filter items. |
| Moderation summary | Core can expose the latest complete judgment, but `complete` does not prove that its source hash matches the current content. |
| Adult preference | The preference affects direct search. It does not make homepage inclusion safe and does not hide direct detail. Existing provider-owned filtering remains documented in [content eligibility](../architecture/content-eligibility.md). |
| Development preview | `/dev/moderation-preview` is registered in the production route graph. Its `beforeLoad` calls `notFound()` when `import.meta.env.DEV` is false, which hides it at runtime but does not exclude it from the route graph or built artifact. The production build emitted both client and server route chunks. Remove or exclude it before release; this has not been done. See `web/src/routes/dev.moderation-preview.tsx`. |
| Production state | No production moderation deploy, backfill, or enforcement has occurred. |

The preview applies artwork blur only to a `complete` judgment classified as `explicit`. Missing, pending, stale, errored, malformed, and `needs_review` summaries are not treated as safe. The blur is a presentation control, not access control for the underlying image.

## Requested product outcome (not implemented)

- Classify new content close to full-detail ingestion and reuse its judgment across surfaces rather than classifying separately for each view.
- Blur explicit artwork by default on detail pages and let the user reveal it. The request does not ask to block direct detail access.
- Exclude classified explicit content from the homepage entirely.
- Run a bounded batch for initial legacy coverage and provide a human-review path for `needs_review` items.
- Later, provide a simple authenticated `/admin` surface to view content, start classification, find `needs_review` items, and submit a manual classification.
- Do not implement the admin surface now. Do not create an issue or run a production rollout as part of this work.

## Recommended flow (proposal only; not user-approved)

1. Persist or refresh the normalized full-detail record first.
2. After the metadata transaction commits, enqueue or coalesce a bounded classification job keyed by content identity and source hash. Classification failure must not fail detail ingestion.
3. Persist the versioned judgment and make freshness explicit by comparing its source hash with the currently reconstructed moderation input.
4. Return detail without waiting on an unbounded Jev request. While the current judgment is pending or unusable, prefer an image-free placeholder over exposing unclassified artwork; decide the exact pending presentation below.
5. Before composing homepage banners and carousels, resolve moderation summaries for the candidate IDs in a bounded batch and remove current explicit judgments. Do not let the existing homepage cache turn stale or missing moderation into a safe result.
6. Run initial legacy classification as a separate, resumable, rate-bounded job after deployment. Never run a catalog backfill during application startup.
7. Keep future admin actions behind an explicit authenticated role and record who started a job or submitted a manual result, what content/judgment version it affected, and when.

This direction fits the existing split: Proxy owns provider calls and its homepage cache, Web fetches and presents the homepage, and Core owns normalized content and persisted judgments. The existing [provider metadata idea](./jev-provider-metadata-for-content-moderation.md) remains a separate future scope; this recommendation uses metadata already persisted by Core.

## Decisions still open

| Decision | Why it remains open |
| --- | --- |
| Pending detail behavior | Choose whether detail remains available while classification is pending and whether the image-free placeholder is required, or whether another safe presentation is preferred. Blocking the public detail response on Jev latency is not recommended, but the product behavior is not ratified. |
| `needs_review` on homepage | The request excludes explicit content, but does not decide whether uncertain items are also excluded, shown without artwork, or allowed through. The fail-closed recommendation needs explicit product acceptance. |
| Freshness and rehydration | Define how source changes invalidate a judgment, when reclassification is scheduled, and how stale/missing status affects cached homepage candidates. The current API summary does not establish source-hash freshness. |
| Classification worker | Choose the queue/worker or equivalent execution mechanism, coalescing and retry behavior, and rate/cost bounds. The current detail path is synchronous and the manual command is not an ingestion scheduler. |
| Admin authority and manual classification | Choose the authentication role, permitted actions, whether an admin may override a model judgment or only request a new run, and required audit fields. |
| Rollout and release gates | Define the measured evaluation and enforcement criteria, batch bounds, and operational rollback before production rollout. The preview route must also be removed/excluded from the production artifact before release. |

Until these choices are resolved, keep the production path passive. Do not interpret this recommendation or the local preview as permission to enforce policy, call Jev during ingestion, or run a production backfill.
