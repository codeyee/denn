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
  [`../../web/src/providers/QueryProvider.tsx`](../../web/src/providers/QueryProvider.tsx)
  (the `QueryClient` is created per request in
  [`../../web/src/router.tsx`](../../web/src/router.tsx) and passed through
  router context + provider).
- Shared query keys:
  [`../../web/src/lib/api/queries/keys.ts`](../../web/src/lib/api/queries/keys.ts)
- Server prefetch for SSR:
  [`../../web/src/lib/api/queries/server.ts`](../../web/src/lib/api/queries/server.ts)
  called from TanStack Router `loader`s via
  `context.queryClient.ensureQueryData(...)` (router dehydration replaces manual
  `HydrationBoundary`).
- Query hooks already in use:
  - `useUserListsQuery`
  - `useUserListQuery`
  - `useListItemsQuery`
  - `useContentDetailQuery`
  - homepage suggestions, search, list stats, full list items, ratings,
    user rating, and Add-to-List membership checks
  - `usePrefetchContentDetail`
- Critical optimistic mutations already extracted under
  `web/src/lib/api/mutations/*`.
- Hover prefetch exists on content cards and list item cards (router default
  `preload: "intent"`).

## Rules For New Reads

- Use query hooks in `web/src/lib/api/queries/` for all server reads.
- Extend `queryKeys` before adding a hook; no ad hoc string keys.
- Keep query ownership at the resource level, not inside giant
  page-specific "do everything" hooks.
- Keep `staleTime` and invalidation decisions local to each resource.
- Reuse the query cache for hover prefetch and back-navigation.
- Routes that can know their initial parameters should prefetch in the
  route `loader` with the per-request `QueryClient` from
  `context.queryClient`.
- Server prefetch for authenticated `core` reads must use the server
  session snapshot (from `beforeLoad` / server functions) and never rely
  on the client Zustand auth store alone.

## Route Search Params

- Prefer typed route search access (`Route.useSearch()` or the
  `validateSearch` output) over reparsing `location.searchStr` manually.
- TanStack Router / Start may serialize search values as JSON strings in
  the URL layer (for example `page=%222%22`), while route validation can
  still decode them correctly for loaders.
- If a client hook must read `searchStr` directly, normalize quoted JSON
  string values before parsing numbers, enums, or sort/group tokens.
- Treat URL search as a single source of truth per route. Do not let a
  loader parse one representation while the client view parses another,
  or the UI can drift from the fetched data.

Reference bug:
- ListDetail pagination regressed after the TanStack migration because
  the route loader read `page=2` correctly, but the client exploration
  hook reparsed `searchStr` and interpreted `"2"` as invalid, falling
  back to page 1 while page-2 data was already fetched.

## Mutation Rules

- Mutations that change server state live under `web/src/lib/api/mutations/`.
- Mutations must invalidate or patch every affected query family.
- Optimistic UI should use `queryClient.setQueryData` snapshots and
  rollback, not parallel Zustand caches.

## Anti-Patterns

- Reintroducing TTL caches inside Zustand stores for server responses.
- Fetching the same server resource in multiple sibling components
  without a shared query key.
- Building new route data flows around `useEffect` + manual loading,
  error, abort, and retry handling.
- Letting `navigate()` churn become the primary state machine for
  search input.
- Sharing a `QueryClient` between server requests.
- Adding a global `staleTime` to hide missing per-resource decisions.

## Current Watch Items

- Keep `.docs/perf/baseline.md` measured as prefetch behavior changes.
- Add broader interaction tests around Add-to-List and ListDetail when
  the frontend test surface grows beyond the current smoke coverage.

The roadmap summary lives in [`../roadmap/open-plans.md`](../roadmap/open-plans.md).
