# Spotify token mode and refresh-token expiration

Last reviewed: 2026-06-28

## Summary

Spotify announced that refresh tokens issued to apps registered on
Spotify for Developers expire after six months. New apps are affected
immediately from 2026-06-18; existing apps are affected from 2026-07-20.

Denn does not currently use Spotify user authorization, Authorization
Code, Authorization Code with PKCE, or Spotify refresh tokens. The
`proxy` service uses Spotify's Client Credentials flow for public album
metadata. That flow returns short-lived access tokens and is explicitly
outside the scope of Spotify's refresh-token expiration change.

## Current Denn behavior

- Spotify provider credentials live only in `proxy` as
  `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
- The Spotify provider requests `grant_type=client_credentials` from
  `https://accounts.spotify.com/api/token`.
- The returned access token is cached under `auth:spotify:token` with a
  TTL derived from Spotify's `expires_in` value.
- Denn stores no Spotify `refresh_token`, no Spotify user authorization
  timestamp, and no Spotify user-scoped grants.
- Browser and `core` traffic reach Spotify only through the existing
  metadata topology: `web`/`core` -> `proxy` -> Spotify.

## Required action for the 2026 Spotify notice

No runtime reauthorization work is required for the current product.
There is no stored Spotify refresh token to discard, no `invalid_grant`
refresh path to handle, and no user Spotify sign-in flow to redirect.

The operational action is to preserve this invariant in tests and code
review: Spotify album metadata must continue to use Client Credentials
unless a future feature intentionally introduces user-delegated Spotify
access.

## If Denn adds user Spotify authorization later

Before shipping any feature that stores or refreshes user-scoped Spotify
tokens:

- store the authorization timestamp, because Spotify refresh tokens do
  not expose their own issue timestamp;
- handle `400 invalid_grant` from the token endpoint by deleting the
  stored token state before starting reauthorization;
- do not retry a failed refresh-token exchange with the same token;
- send the user through the appropriate Authorization Code or PKCE flow
  to obtain a fresh six-month refresh-token lifetime;
- document the new flow in an ADR because it changes credential
  ownership and service responsibility.

## Verification

- Code path: `proxy/internal/providers/spotify/client.go`
- Regression guard:
  `proxy/internal/providers/spotify/albums_test.go`
- Focused command:
  `cd proxy && go test ./internal/providers/spotify`
