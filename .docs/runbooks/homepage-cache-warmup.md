# Runbook — Homepage Cache Warmup

Use this after a proxy deploy or cache flush to populate the critical
homepage keys deliberately. The handler writes both the five-minute
fresh entry and the 30-minute stale fallback.

## Choose The Key Matrix

Warm only real defaults. At minimum record:

- country (`X-User-Country`);
- page;
- limit;
- deployed commit SHA;
- policy versions visible in the cache key.

The current default matrix is page 1, limit 10, for the countries used
by the deployed web configuration. Do not enumerate every country
without traffic evidence.

## Warm And Verify

Run from an environment that already has the server-only proxy API key:

```bash
curl --fail --silent --show-error \
  -H "X-Api-Key: ${PROXY_API_KEY}" \
  -H "X-Api-Consumer: core" \
  -H "X-User-Country: CO" \
  "https://<proxy-host>/v1/proxy/homepage?page=1&limit=10" \
  -D /tmp/denn-homepage-warm.headers \
  -o /tmp/denn-homepage-warm.json
```

Repeat the same request and verify:

- first response is `MISS` unless a stale/fresh entry already exists;
- second response is `HIT`;
- total response time stays inside the 2.5 s cold budget;
- all five buckets exist, with per-bucket errors rather than an
  aggregate `5xx` if one provider is degraded;
- logs show the bounded cache state and no credentials.

Never place `PROXY_API_KEY` in browser code, shell history as a literal,
or the warmup artifact.

## Stale Refresh

When the fresh key expires but the stale key remains:

- the response must be `STALE` without waiting for providers;
- one `homepage_refresh` starts per cache key;
- completion logs include success and duration;
- the next request becomes `HIT` after a successful refresh.
