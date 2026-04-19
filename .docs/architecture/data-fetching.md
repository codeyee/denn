# Frontend Data Fetching

This document defines the intended data-layer split in `web` and records
the current migration state.

## Rule

- Server state belongs in TanStack Query.
- Client/UI state belongs in Zustand or component state.
- New read paths should not introduce `useEffect` + ad hoc `fetch`
  orchestration when a query hook can own the resource lifecycle.

## What Is Already Standard

- Global query provider:
  [`../../web/app/_providers/QueryProvider.tsx`](../../web/app/_providers/QueryProvider.tsx)
- Shared query keys:
  [`../../web/lib/api/queries/keys.ts`](../../web/lib/api/queries/keys.ts)
- Query hooks already in use:
  - `useUserListsQuery`
  - `useUserListQuery`
  - `useListItemsQuery`
  - `useContentDetailQuery`
  - `usePrefetchContentDetail`
- Critical optimistic mutations already extracted under
  `web/lib/api/mutations/*`.
- Hover prefetch exists on content cards and list item cards.

## What Is Still Transitional

The following areas still carry legacy read orchestration and are active
migration targets:

- Home:
  [`../../web/app/_components/pages/HomePage/hooks/useHomeData.ts`](../../web/app/_components/pages/HomePage/hooks/useHomeData.ts)
- Search:
  [`../../web/app/_components/pages/SearchPage/hooks/useSearchResults.ts`](../../web/app/_components/pages/SearchPage/hooks/useSearchResults.ts)
- List detail bootstrap and pagination:
  [`../../web/app/_components/pages/ListDetailPage/hooks/useListData.ts`](../../web/app/_components/pages/ListDetailPage/hooks/useListData.ts)
- Add-to-list modal and related list selection flows.
- Parts of the rating flows that still bridge directly through stores.

These files should be treated as legacy patterns. They may be
maintained, but they should not be copied into new features.

## Current Practical Guidance

- Use query hooks in `web/lib/api/queries/` for new reads.
- Keep query ownership at the resource level, not inside giant
  page-specific "do everything" hooks.
- Keep `staleTime` and invalidation decisions local to each resource.
- Reuse the query cache for hover prefetch and back-navigation.
- Prefer server prefetch plus client hydration once
  `HydrationBoundary` is introduced for a route.

## Anti-Patterns

- Reintroducing TTL caches inside Zustand stores for server responses.
- Fetching the same server resource in multiple sibling components
  without a shared query key.
- Building new route data flows around `useEffect` + manual loading,
  error, abort, and retry handling.
- Letting `router.push()` churn become the primary state machine for
  search input.

## Near-Term Work

- Finish the planned migration described in the detailed notes under `.docs/sprints/`.
- Generalize SSR prefetch and `HydrationBoundary`.
- Remove fetch logic from `lists-store` and `content-store` once the
  remaining read paths are migrated.

The roadmap summary lives in [`../roadmap/open-plans.md`](../roadmap/open-plans.md).
