# Auth BFF Rollout And Rollback

Use this runbook when deploying or reverting the HttpOnly-cookie auth
boundary from ADR 0002.

## Required Configuration

`web`:

- `API_URL`: internal `core` base ending in `/api`.
- `AUTH_COOKIE_SECURE=true` in every HTTPS environment.
- `AUTH_COOKIE_DOMAIN`: leave unset for host-only cookies unless the
  deployment has an explicitly reviewed shared-domain requirement.

`core`:

- `AUTH_COOKIE_SECURE=True`.
- `AUTH_COOKIE_DOMAIN`: normally unset because browser auth terminates
  at `web`.
- `SIMPLE_JWT` rotation and blacklist applications/migrations enabled.

Local HTTP browser fixtures explicitly set both secure flags false.

## Forward Rollout

1. Back up the database and confirm token-blacklist migrations are
   current.
2. Deploy `web` first. Its BFF accepts both the prior JSON token response
   and the new core `Set-Cookie` response, so this step is backward
   compatible.
3. Smoke login, hard refresh, one authenticated read, one CSRF-protected
   mutation, refresh, logout, and logout-all.
4. Deploy `core` with HttpOnly cookies and identity-only login/register
   JSON.
5. Repeat the smoke matrix. Verify:
   - browser responses contain no `access` or `refresh`;
   - auth cookies are `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`;
   - `document.cookie`, Zustand, and localStorage contain no JWT;
   - missing/mismatched CSRF returns `403`;
   - an old refresh token is rejected after rotation;
   - transient `core` failure preserves the known client identity.
6. Monitor auth `401/403/429/5xx`, refresh failures, login latency, and
   redirect loops through at least one refresh lifetime boundary.

## Rollback

The old web expects tokens in core JSON, so order matters:

1. Roll back `core` first to the JSON-token-compatible release.
2. Verify the still-new BFF can login and refresh against that release.
3. Only then roll back `web`.
4. Do not disable token rotation or clear blacklist tables during a
   rollback. Existing sessions may need to log in again; that is safer
   than resurrecting revoked refresh credentials.
5. If the incident is cookie scope only, keep the code deployed and fix
   `AUTH_COOKIE_DOMAIN`/`AUTH_COOKIE_SECURE`, then repeat the smoke
   matrix.
