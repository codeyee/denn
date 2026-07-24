# Runbook — Client Session Bootstrap Smoke

Use this manual smoke when changing auth bootstrap, protected routes, or
login redirect behavior in `web`.

Run the automated production-build characterization first:
[`browser-e2e-and-baseline.md`](./browser-e2e-and-baseline.md).

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
- Auth cookies remain present.
- After `core` recovers, **Retry session check** restores the protected
  route without another login.

### 6. Slow backend

1. Add 6–10 seconds of latency to the auth profile endpoint.
2. Hard refresh a protected route.

Expected:

- The route displays **Session check timed out** and a retry action.
- The known session and cookies remain intact.
- Recovery plus retry restores the route.

### 7. Explicitly expired refresh

1. Keep an expired access token and make refresh return a confirmed
   `401`.
2. Open a protected route.

Expected:

- Cookies and in-memory credentials are cleared.
- The route redirects to `/login?next=...` once.
- The session log resolution is `expired`, not `unavailable`.

### 8. Logout from a protected route

1. Log in and open `/profile`.
2. Use the visible Logout control.

Expected:

- The final URL is `/`.
- The public landing renders once.
- The URL does not recursively grow `/login?next=/login?...`.

## Developer Signals

- Inspect structured `session_bootstrap` events in the server logs and
  correlate them with outbound requests by `request_id`.
- An unavailable/slow session must remain distinguishable from an
  anonymous session; do not infer logout from a transient transport
  failure.
- `session_refresh` logs must contain only the bounded resolution and
  must never include tokens.
