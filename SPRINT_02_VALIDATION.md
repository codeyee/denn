# Sprint 02 Validation

## Scope covered
- `home` server-first entry and homepage data flow cleanup
- `search` server-first entry and search state flow cleanup
- auth/session bridge required to make server route entry viable for authenticated users

## Checklist mapping

### Lote 2A
- `useHomeData()` no longer serializes homepage requests.
- `home` can render lists when suggestions fail, and suggestions when lists fail.
- Loading and error handling are separated by block instead of being coupled through a single full-screen failure path.

### Lote 2B
- Search now has one effective debounce for execution.
- Fetch no longer depends on the old `input -> URL -> input -> debounce -> fetch` cycle.
- `/search?q=...` remains a valid deep link and initial server render source.

### Lote 2C
- `app/page.tsx` and `app/search/page.tsx` moved from client route entrypoints to server route entrypoints.
- `home` and `search` no longer depend on global read stores for initial page data.
- No broad Zustand read subscriptions remain on the critical path for `home` and `search`; initial page reads now flow through explicit server props.

## Before / after comparisons

### Home request flow

#### Before
- Route entry was client-only in `app/page.tsx`.
- Auth state was resolved only after Zustand rehydration from `localStorage`.
- `HomePage` mounted and `useHomeData()` fetched suggestions first.
- Only after suggestions completed did it trigger `fetchLists()`.
- Effective homepage data sequence for authenticated users:
  - auth hydration on client
  - suggestions request
  - lists request

#### After
- Route entry is server-first in `app/page.tsx`.
- Session is resolved on the server from cookies.
- Homepage data is fetched on the server in `Promise.allSettled`.
- Suggestions and lists are requested in parallel.
- Effective homepage data sequence for authenticated users:
  - session resolution
  - suggestions request in parallel with lists request

#### Outcome
- The homepage no longer has a suggestions-to-lists waterfall.
- A failure in one block no longer blanks the entire page.

### Search flow

#### Before
- Route entry was client-only in `app/search/page.tsx`.
- `useSearchQuery()` had two debounces:
  - one to push input state into the URL;
  - one to read URL state back into `debouncedQuery`.
- Effective search flow while typing:
  - input change
  - debounce
  - `router.push('/search?q=...')`
  - search params update
  - second debounce
  - fetch

#### After
- Route entry is server-first in `app/search/page.tsx`.
- Initial deep-link query can be rendered from the server.
- Search input state is local and authoritative in `SearchRouteShell`.
- A single debounce drives result fetching.
- URL synchronization is secondary and uses `history.replaceState` rather than router churn on each debounced keystroke.
- Effective search flow while typing:
  - input change
  - debounce
  - fetch
  - URL sync

#### Outcome
- The old double-synchronization loop is removed.
- Search remains shareable via `/search?q=...` without making the URL the bottleneck.

## Client work reduction
- `app/page.tsx` is no longer a client component.
- `app/search/page.tsx` is no longer a client component.
- `home` initial read path no longer depends on `content-store` and `lists-store`.
- `search` initial read path no longer depends on `useSearchQuery()` coordinating router state as the source of truth.
- Client work remains for interaction and UI state, but route entry and initial read orchestration moved to the server.

## Validation run
- `npm run lint`: pass
- `npm run build`: pass

## Notes
- The security model is improved only enough to support server-readable session state for these routes.
- Full migration to `HttpOnly`/server-managed auth cookies remains future work and is documented separately in Sprint 06.
