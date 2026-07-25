# Client Rehydration Policy

This document is the source of truth for authenticated session
bootstrap in `web`.

## Current Behavior

- The root TanStack Start route resolves session server-side in
  [`web/src/routes/__root.tsx`](../../web/src/routes/__root.tsx) via
  `getSessionFn()`.
- The server snapshot is injected once into
  [`AuthSessionBootstrap`](../../web/src/components/routes/AuthSessionBootstrap.tsx),
  which is the only client bridge from SSR session state into Zustand.
- Protected routes enforce auth twice on purpose:
  - route-level `beforeLoad` redirects anonymous users before render;
  - [`ProtectedRoute`](../../web/src/components/common/providers/ProtectedRoute.tsx)
    handles the client bootstrap race and the unavailable-backend case.

## Session Model

`SessionSnapshot` distinguishes six states:

- `authenticated`: user and access token were resolved successfully.
- `anonymous`: no valid session exists and protected routes should
  redirect to `/login`.
- `expired`: the refresh credential was explicitly rejected and the
  client may safely clear the dead session.
- `unavailable`: `core` could not be reached or session resolution
  failed operationally; the UI must degrade without pretending the user
  explicitly logged out.
- `timeout`: session resolution exceeded its bounded deadline; the user
  can retry without losing the known session.
- `pending`: the client bootstrap has not reached a terminal resolution.

Additional flags:

- `needsCookieSync`: the server determined that auth cookies are stale
  and the client should clear its JS-readable cookies plus local auth
  state.

## Storage Responsibilities

| Data | Source of truth | Client persistence | Notes |
|---|---|---|---|
| `accessToken`, `refreshToken` | cookies + in-memory store | not persisted to `localStorage` | phase 1 of ADR 0002 |
| `user`, `isAuthenticated` | SSR snapshot + Zustand | persisted in `auth-storage` | UI continuity only |
| `sessionResolution` | SSR snapshot + Zustand | in-memory only | operational state, not durable |

## Route Protection Rules

- Any protected route must call the shared helper in
  `web/src/lib/auth/protected-route.ts` from `beforeLoad`.
- `beforeLoad` redirects only when session resolution is `anonymous` or
  `expired`.
- `ProtectedRoute` must not be the only protection layer for a route.
- `ProtectedRoute` still gates `isBootingSession =
  isAuthenticated && !accessToken` to avoid protected child effects
  firing before the bootstrap copies tokens into memory.

## Login Redirect Policy

- Protected-route redirects include a `next` search param.
- Login and registration redirect confirmed authenticated sessions to
  `/` from route `beforeLoad`, before either form renders.
- `next` must be sanitized as an internal path only.
- Absolute URLs, protocol-relative URLs, and non-rooted paths are
  rejected.
- After successful login, `useAuth()` navigates to the sanitized `next`
  target or `/` by default.

## Failure Behavior

- `anonymous` or `expired` + protected route: SSR redirect to
  `/login?next=...`.
- `unavailable` or `timeout` + protected route: no redirect and no token
  clearing; render a recoverable fallback with retry unless an already
  authenticated snapshot can continue safely.
- `needsCookieSync=true` is reserved for an explicitly expired refresh
  credential, never a timeout, network error, or upstream `5xx`.

## Observability

- `ProtectedRoute` emits `slow_session_bootstrap` when the client
  bootstrap window exceeds 200 ms.
- It emits `stuck_session_bootstrap` and moves to the recoverable
  `timeout` state if the boot window exceeds 5 seconds. It does not clear
  the session.
- These events are currently client console signals, not a dedicated
  telemetry pipeline.

## Adding A New Protected Route

Checklist:

- Add `beforeLoad` auth enforcement using the shared helper.
- Wrap the rendered UI with `ProtectedRoute`.
- If the route has its own loader, rely on `context.session` from the
  root route instead of the client store.
- If the route can be resumed after login, preserve `location.pathname`
  and `location.searchStr` in `next`.
- Add or update router/integration tests when the route shape changes.
