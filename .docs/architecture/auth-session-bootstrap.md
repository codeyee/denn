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
- Protected routes also enforce SSR redirects at the route level via
  TanStack Router `beforeLoad`, so anonymous users do not depend only on
  a client-side redirect.
- Session resolution distinguishes `pending`, `anonymous`,
  `authenticated`, `expired`, `unavailable`, and `timeout`. A dead or
  slow `core` dependency degrades to a recoverable state instead of
  looking identical to a logged-out user.

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
- Only an explicit refresh rejection (`401`) produces `expired` and
  `needsCookieSync`; timeouts, network failures, and upstream `5xx`
  preserve the last known user and tokens.
- Login and registration requests have bounded deadlines. Successful
  auth invalidates router state before entering the destination route;
  logout navigates home before invalidation to avoid redirect loops.
- A protected route in `unavailable` or `timeout` state exposes a retry
  action rather than clearing credentials.

## Current Gaps

- Cookies are still not `HttpOnly`; ADR 0002 phases 2 and 3 are pending.
- `ProtectedRoute` still keeps the client-side redirect as a fallback,
  so protected-route policy now exists in both route-level and client
  guard layers and must stay aligned.
- Browser E2E covers hard refresh, delayed detail, transient auth
  failures, logout, keyboard navigation, and the critical
  login-to-detail flow.

## Rules For New Protected Routes

- Keep the route under the global root bootstrap path (`__root.tsx`).
- Keep both protection layers: route-level `beforeLoad` for SSR auth
  behavior and `ProtectedRoute` for the client bootstrap race /
  unavailable-backend fallback.
- Do not mount extra copies of `AuthSessionBootstrap` inside shells,
  pages, or feature components.
- Do not persist JWTs back into `localStorage`.
- If a new route needs special auth behavior, document it here and in
  ADR 0002 rather than creating another local policy.

## Next Steps

- Keep adding protected-route helpers instead of hand-writing auth logic
  in individual route files.
- Keep the production-build session regression scenarios in the PR gate.
- Migrate to `HttpOnly` auth cookies with a BFF-mediated auth flow.
