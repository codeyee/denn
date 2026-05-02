# Auth Session Bootstrap

This document records the current frontend session model and the gaps
that still exist after ADR 0002 phase 1.

## Current State

- `localStorage` persists only `user` and `isAuthenticated`.
- `accessToken` and `refreshToken` are not persisted to `localStorage`.
- Tokens still live in JS-readable cookies and in-memory Zustand state.
- The root route (`__root.tsx`) resolves session server-side on every
  request (`beforeLoad` calling `getSessionFn` / `getCountryFn`).
- `AuthSessionBootstrap` copies the server snapshot into the client
  store from a single global mount point.
- `ProtectedRoute` guards the bootstrap race window with
  `isBootingSession = isAuthenticated && !accessToken`.

Relevant code:

- Root bootstrap + providers:
  [`../../web/src/routes/__root.tsx`](../../web/src/routes/__root.tsx)
- Cookie-to-store bridge:
  [`../../web/src/components/routes/AuthSessionBootstrap.tsx`](../../web/src/components/routes/AuthSessionBootstrap.tsx)
- Protected route guard:
  [`../../web/src/components/common/providers/ProtectedRoute.tsx`](../../web/src/components/common/providers/ProtectedRoute.tsx)
- Store persistence policy:
  [`../../web/src/stores/auth-store.ts`](../../web/src/stores/auth-store.ts)
- Server session resolution:
  [`../../web/src/server/session.ts`](../../web/src/server/session.ts)

## Current Guarantees

- A hard refresh on a protected route no longer depends on
  `localStorage` carrying the JWTs.
- If refresh fails server-side, `needsCookieSync` causes the client to
  clear stale cookies and session state.
- The root route degrades to a logged-out shell when session resolution
  fails instead of crashing the app boundary.

## Current Gaps

- Cookies are still not `HttpOnly`; ADR 0002 phases 2 and 3 are pending.
- There is no TanStack Router `beforeLoad` redirect on protected routes
  for unauthenticated users before the client shell renders (see
  `ProtectedRoute` client-side redirect today).
- `ProtectedRoute` still performs a client-side redirect to `/login`.
- Regression coverage for the bootstrap policy is still incomplete.

## Rules For New Protected Routes

- Keep the route under the global root bootstrap path (`__root.tsx`).
- Wrap protected UI with `ProtectedRoute` until router-level auth
  redirects are formalized.
- Do not mount extra copies of `AuthSessionBootstrap` inside shells,
  pages, or feature components.
- Do not persist JWTs back into `localStorage`.
- If a new route needs special auth behavior, document it here and in
  ADR 0002 rather than creating another local policy.

## Next Steps

- Add server-side protected-route redirects (e.g. `beforeLoad` +
  `redirect()` from TanStack Router) where appropriate.
- Add regression tests for hard refresh, dead cookies, and backend-down
  paths.
- Migrate to `HttpOnly` auth cookies with a BFF-mediated auth flow.

Detailed execution notes live under `.docs/sprints/`.
