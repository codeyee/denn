# Auth Session Bootstrap

This document records the frontend session model after all ADR 0002
phases.

## Current State

- `localStorage` and Zustand persist only `user`, `isAuthenticated`, and
  non-sensitive resolution/UI state.
- Access and refresh JWTs live only in `HttpOnly`, production-`Secure`,
  `SameSite=Lax`, `Path=/` cookies owned by `web`.
- The root route (`__root.tsx`) resolves session server-side on every
  request (`beforeLoad` calling `getSessionFn` / `getCountryFn`).
- `AuthSessionBootstrap` copies only identity and resolution into the
  client store from a single global mount point.
- `ProtectedRoute` guards the bootstrap race using persisted identity
  plus `sessionResolution=pending`; it never reads a token.
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
- Only an explicit refresh rejection produces `expired` and server-side
  cookie deletion; timeouts, network failures, and upstream `5xx`
  preserve the last known client identity.
- Login and registration requests have bounded deadlines. Successful
  auth invalidates router state before entering the destination route;
  logout navigates home before invalidation to avoid redirect loops.
- A protected route in `unavailable` or `timeout` state exposes a retry
  action rather than clearing credentials.

## Remaining Constraints

- `ProtectedRoute` keeps the client-side redirect as a fallback,
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
- Do not add JWTs to browser JSON, Zustand, localStorage, or
  JavaScript-readable cookies.
- Authenticated browser API calls must use `/api/core/*`; auth lifecycle
  calls must use fixed `/api/auth/*` routes.
- If a new route needs special auth behavior, document it here and in
  ADR 0002 rather than creating another local policy.

## Operational Verification

Keep the production-build session regression scenarios in the PR gate
and use
[`../runbooks/auth-bff-rollout.md`](../runbooks/auth-bff-rollout.md)
for deployment order, cookie/CSRF checks, and rollback.
