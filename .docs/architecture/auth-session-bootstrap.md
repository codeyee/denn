# Auth Session Bootstrap

This document records the current frontend session model and the gaps
that still exist after ADR 0002 phase 1.

## Current State

- `localStorage` persists only `user` and `isAuthenticated`.
- `accessToken` and `refreshToken` are not persisted to `localStorage`.
- Tokens still live in JS-readable cookies and in-memory Zustand state.
- `RootLayout` resolves the session server-side on every request.
- `AuthSessionBootstrap` copies the server snapshot into the client
  store from a single global mount point.
- `ProtectedRoute` guards the bootstrap race window with
  `isBootingSession = isAuthenticated && !accessToken`.

Relevant code:

- Layout bootstrap:
  [`../../web/app/layout.tsx`](../../web/app/layout.tsx)
- Cookie-to-store bridge:
  [`../../web/app/_components/routes/AuthSessionBootstrap.tsx`](../../web/app/_components/routes/AuthSessionBootstrap.tsx)
- Protected route guard:
  [`../../web/app/_components/common/providers/ProtectedRoute.tsx`](../../web/app/_components/common/providers/ProtectedRoute.tsx)
- Store persistence policy:
  [`../../web/app/_stores/auth-store.ts`](../../web/app/_stores/auth-store.ts)
- Server session resolution:
  [`../../web/lib/auth/session-server.ts`](../../web/lib/auth/session-server.ts)

## Current Guarantees

- A hard refresh on a protected route no longer depends on
  `localStorage` carrying the JWTs.
- If refresh fails server-side, `needsCookieSync` causes the client to
  clear stale cookies and session state.
- The layout degrades to a logged-out shell when session resolution
  fails instead of crashing the app boundary.

## Current Gaps

- Cookies are still not `HttpOnly`; ADR 0002 phases 2 and 3 are pending.
- There is no `web/middleware.ts` yet to redirect protected routes
  server-side before render.
- `ProtectedRoute` still performs a client-side redirect to `/login`.
- There is no documented `next` redirect flow after login.
- Regression coverage for the bootstrap policy is still incomplete.

## Rules For New Protected Routes

- Keep the route under the global `RootLayout` bootstrap path.
- Wrap protected UI with `ProtectedRoute` until middleware-based
  protection exists.
- Do not mount extra copies of `AuthSessionBootstrap` inside shells,
  pages, or feature components.
- Do not persist JWTs back into `localStorage`.
- If a new route needs special auth behavior, document it here and in
  ADR 0002 rather than creating another local policy.

## Next Steps

- Add server-side protected-route redirects in Next middleware.
- Add regression tests for hard refresh, dead cookies, and backend-down
  paths.
- Migrate to `HttpOnly` auth cookies with a BFF-mediated auth flow.

Detailed execution notes live under `.docs/sprints/`.
