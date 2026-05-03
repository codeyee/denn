# Runbook — Client Session Bootstrap Smoke

Use this manual smoke when changing auth bootstrap, protected routes, or
login redirect behavior in `web`.

## Preconditions

- `web` and `core` are running.
- You have a valid user account.
- Use a production-like frontend build when checking visible flashes if
  possible.

## Scenarios

### 1. Hard refresh on protected content route

1. Log in.
2. Navigate to `/content/<valid-id>`.
3. Hard refresh the page.

Expected:

- The final URL stays on `/content/<id>`.
- The page does not bounce to `/login`.
- No protected fetch fails because the client store missed the token
  bootstrap.

### 2. Hard refresh on protected list route

1. Log in.
2. Navigate to `/lists/<valid-id>`.
3. Hard refresh the page.

Expected:

- The final URL stays on `/lists/<id>`.
- The route loads normally after bootstrap.

### 3. Deep-link without session

1. Clear auth cookies.
2. Open `/content/<valid-id>` in a new tab.

Expected:

- SSR redirects to `/login?next=/content/<id>`.
- Protected content does not visibly render first.

### 4. Dead cookies

1. Log in and open a protected route.
2. Corrupt or remove one/both auth cookies manually.
3. Hard refresh.

Expected:

- Client bootstrap clears stale auth state.
- Final state is `/login` rather than a half-authenticated shell.

### 5. Backend unavailable

1. Log in.
2. Stop `core`.
3. Hard refresh a protected route.

Expected:

- The app does not crash.
- ProtectedRoute shows the unavailable fallback instead of redirecting
  as if the user logged out intentionally.

## Developer Signals

- Watch for `slow_session_bootstrap` in the browser console.
- `stuck_session_bootstrap` is a regression-level event and should not
  appear in a healthy local environment.
