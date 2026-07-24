# Performance Baseline

This document is the source of truth for performance measurement on the
critical login, home, search, detail, lists, and profile flows.

It keeps two kinds of evidence separate:

- the last browser audit against the deployed application;
- the deterministic production-build fixture used by CI and local
  regression work.

Fixture numbers are a repeatable engineering floor. They are not a claim
about Internet, database, Redis, or provider latency in production.

## Deployed Browser Audit Snapshot

Source: browser audit captured before Phase 0 fixes, recorded in issue
[#26](https://github.com/codeyee/denn/issues/26).

| Flow | State | TTFB | Visually stable | Interpretation |
|---|---|---:|---:|---|
| Home | browser cold | 1,030 ms | 2,410 ms | Deployed baseline before remediation |
| Home | browser warm | 780–840 ms | 2,170–2,240 ms | Cache helps, but does not remove the slow path |

The original audit did not publish raw samples for the other routes, so
Phase 0 does not invent production percentiles for them. The scheduled
browser job preserves the repeatable harness until a non-personal staging
fixture is available for deployed after-measurements.

## Repeatable Production-Build Baseline

Captured 2026-07-23 on macOS arm64 with Chromium, the Nitro production
bundle, deterministic `core`/`proxy` fixture services, five fresh browser
contexts per flow, and a second load in each context for warm state.

Command:

```bash
make e2e-web-performance
```

Raw artifact:
`web/test-results/phase0-baseline.json`. CI regenerates and uploads the
same artifact through `Browser Baseline`.

Values below are milliseconds except CLS.

| Flow | State | TTFB p50/p75/p95 | FCP p75 | LCP p50/p75/p95 | INP p75/p95 | CLS p75/p95 | Data/cache state |
|---|---|---|---:|---|---|---|---|
| Login | cold | 9.1 / 11.1 / 21.2 | 32 | 32 / 48 / 468 | 0 / 0 | 0 / 0 | no authenticated data |
| Login | warm | 7.5 / 7.8 / 10.0 | 44 | 40 / 44 / 44 | 0 / 0 | 0 / 0 | browser warm |
| Home | cold | 13.8 / 13.9 / 43.5 | 40 | 40 / 40 / 72 | 0 / 0 | 0 / 0 | proxy MISS, core DB fixture |
| Home | warm | 14.0 / 14.1 / 16.1 | 52 | 52 / 52 / 52 | 0 / 0 | 0 / 0 | proxy HIT, core DB fixture |
| Search | cold | 11.2 / 11.6 / 12.0 | 32 | 100 / 104 / 108 | 16 / 16 | 0 / 0 | proxy BYPASS |
| Search | warm | 16.2 / 19.0 / 19.3 | 60 | 56 / 60 / 96 | 16 / 16 | 0 / 0 | browser warm, proxy BYPASS |
| Detail | cold | 10.6 / 10.6 / 14.0 | 32 | 88 / 92 / 96 | 0 / 0 | 0 / 0 | core local fixture |
| Detail | warm | 15.3 / 15.9 / 19.2 | 52 | 84 / 84 / 84 | 0 / 0 | 0 / 0 | browser warm, core local fixture |
| Lists | cold | 6.6 / 7.1 / 11.6 | 72 | 92 / 92 / 96 | 0 / 0 | 0.04 / 0.04 | core DB fixture |
| Lists | warm | 9.3 / 9.8 / 12.4 | 72 | 84 / 88 / 92 | 0 / 0 | 0.04 / 0.04 | browser warm, core DB fixture |
| Profile | cold | 5.0 / 5.7 / 6.3 | 68 | 64 / 68 / 72 | 0 / 0 | 0 / 0 | session profile fixture |
| Profile | warm | 6.9 / 7.5 / 7.6 | 68 | 68 / 68 / 72 | 0 / 16 | 0 / 0 | browser warm |

An INP value of `0` means no qualifying event-duration entry was emitted
for that sample; it is not treated as proof of zero input latency.

## Backend Telemetry Contract

With `PERF_LOGGING_ENABLED=true`, every critical `core` request emits:

- `duration_ms`, `payload_size_bytes`, and `authenticated`;
- `query_count` and `db_time_ms`;
- `proxy_calls` and `proxy_time_ms`;
- `data_fresh`, `data_stale`, `data_missing`, and `provider_fetches`.

`proxy` access logs add `consumer`, `bytes_out`, and bounded
`cache_status` (`HIT`, `MISS`, `STALE`, or `BYPASS`). `web` emits
`session_bootstrap`, `outbound_http_request`, BFF `http_request`, and
`web_vital` events with the same bounded request ID.

## Alert Thresholds

These are initial actionable p95 gates. Alert only after enough traffic
exists for the route/window.

| Flow or signal | Warning threshold | Window/action |
|---|---|---|
| Login/session bootstrap | p95 > 1,500 ms or unavailable > 1% | 5 min; inspect `session_bootstrap` by resolution |
| Home | p95 TTFB > 800 ms or LCP > 2,500 ms | 10 min; split by cache status |
| Search | p95 end-to-end > 1,200 ms | 10 min; inspect provider partial failures |
| Detail | p95 core > 200 ms warm or > 600 ms cold | 10 min; split DB fresh/stale/provider fetch |
| Lists | p95 core > 400 ms or `query_count > 10` | 10 min; inspect query and proxy counts |
| Profile | p95 core > 250 ms | 10 min; inspect auth and DB timing |
| Any critical route | 5xx > 1% | 5 min |
| Proxy cache | cache errors > 0 or sustained HIT ratio < 80% after warm-up | 5 min; inspect Redis and cache keys |
| Web Vitals | LCP > 2,500 ms, INP > 200 ms, or CLS > 0.10 at p75 | rolling release window |

## Repeat Procedure

1. Run `make e2e-web` to prove the production bundle and fixture flow.
2. Run `make e2e-web-performance` for five cold and five warm samples.
3. Preserve `web/test-results/phase0-baseline.json` as the raw artifact.
4. For deployed measurements, use only a dedicated fixture account and
   record target, commit SHA, region, cache state, browser/device, and
   sample count.
5. Enable `PERF_LOGGING_ENABLED=true` on `core` and join `web`, `core`,
   and `proxy` events by `request_id`.
6. Compare p50/p75/p95 by route and cache/data state; never merge fixture
   numbers with deployed production numbers.

## Update Policy

- Any PR touching a critical request path must run the relevant smoke and
  state whether this baseline changed.
- Do not replace deployed evidence with fixture values.
- Add an after snapshot only after the corresponding remediation is
  deployed and measured with the same method.
