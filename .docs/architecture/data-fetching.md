# Frontend Data Fetching

This document defines the data-layer split in `web`.

## Rule

- Server state belongs in TanStack Query.
- Client/UI state belongs in Zustand or component state.
- UI ephemeral state belongs in component state.
- New read paths must not introduce `useEffect` + ad hoc `fetch`
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
  - homepage suggestions, search, list stats, full list items, ratings,
    user rating, and Add-to-List membership checks
  - `usePrefetchContentDetail`
- Critical optimistic mutations already extracted under
  `web/lib/api/mutations/*`.
- Hover prefetch exists on content cards and list item cards.
- Major protected routes prefetch server-side with `HydrationBoundary`.

## Rules For New Reads

- Use query hooks in `web/lib/api/queries/` for all server reads.
- Extend `queryKeys` before adding a hook; no ad hoc string keys.
- Keep query ownership at the resource level, not inside giant
  page-specific "do everything" hooks.
- Keep `staleTime` and invalidation decisions local to each resource.
- Reuse the query cache for hover prefetch and back-navigation.
- Server-rendered routes that can know their initial parameters should
  prefetch with a per-request `QueryClient` and wrap the client tree in
  `HydrationBoundary`.
- Server prefetch for authenticated `core` reads must use the server
  session snapshot and never rely on the client Zustand auth store.

## Mutation Rules

- Mutations that change server state live under `web/lib/api/mutations/`.
- Mutations must invalidate or patch every affected query family.
- Optimistic UI should use `queryClient.setQueryData` snapshots and
  rollback, not parallel Zustand caches.

## Anti-Patterns

- Reintroducing TTL caches inside Zustand stores for server responses.
- Fetching the same server resource in multiple sibling components
  without a shared query key.
- Building new route data flows around `useEffect` + manual loading,
  error, abort, and retry handling.
- Letting `router.push()` churn become the primary state machine for
  search input.
- Sharing a `QueryClient` between server requests.
- Adding a global `staleTime` to hide missing per-resource decisions.

## Current Watch Items

- Keep `.docs/perf/baseline.md` measured as prefetch behavior changes.
- Add broader interaction tests around Add-to-List and ListDetail when
  the frontend test surface grows beyond the current smoke coverage.

The roadmap summary lives in [`../roadmap/open-plans.md`](../roadmap/open-plans.md).
