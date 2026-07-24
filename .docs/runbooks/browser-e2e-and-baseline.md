# Runbook — Browser E2E And Performance Baseline

Use this runbook when changing authentication, navigation, a critical
request path, cache/data freshness, or browser performance.

The suite runs the Nitro production bundle against deterministic,
non-personal `core` and `proxy` fixtures. It never calls a provider,
production database, or personal account.

## Prerequisites

- Node.js 22 and pnpm 10.6.3.
- Dependencies installed with `pnpm install --frozen-lockfile` in
  `web/`.
- Chromium installed with
  `pnpm exec playwright install chromium`.

The fixture account exists only inside the local test server:

- email: `phase0@example.test`
- password: `fixture-password`

## Stable Smoke Gate

```bash
make e2e-web
```

This builds `web` for production and runs Chromium in desktop and mobile
projects. It covers:

- anonymous deep-link -> login -> safe `next` return;
- valid session, expired access token and one refresh;
- Home, Search, id-first Detail, Lists and Profile;
- click navigation, hard refresh and keyboard focus;
- one bounded request ID across `web`, `core` and `proxy`;
- `MISS`, `HIT` and `STALE` cache headers plus `Server-Timing`;
- unexpected page/console errors, including React hydration failures.

The desktop smoke is the required pull-request CI gate. Mobile remains
part of the local full smoke so responsive coverage is cheap to repeat.

## Known Regression Characterization

```bash
make e2e-web-regressions
```

Expected result: exit `0`. Ten promoted regression gates pass and the
deliberate artifact probe is skipped unless explicitly enabled.

The suite proves:

- hover/focus prefetch performs no content mutation;
- 500 ms and 2 s detail reads complete with feedback in under 100 ms;
- a 6.5 s detail read reaches the bounded error state and recovers by
  explicit retry without losing the session;
- detail `5xx`, transient session `5xx`, and session timeout all expose
  recoverable UI;
- logout does not loop, critical navigation emits no React 418/hydration
  error, and the base landmark/zoom/touch contract holds.

## Failure Artifact Probe

```bash
make e2e-web-artifact-check
```

Expected result: non-zero. The test fails deliberately so the following
files can be inspected under `web/test-results/artifacts/`:

- `trace.zip`;
- `test-failed-*.png`;
- `video.webm`;
- `network.redacted.json`.

The network artifact contains method, resource type, status, normalized
pathname and redacted query values. It must not contain headers, bodies,
cookies, JWTs, credentials, emails, or raw search terms.

## Cold/Warm Baseline

```bash
make e2e-web-performance
```

The job takes five fresh browser-context samples and five warm reloads
for Login, Home, Search, Detail, Lists and Profile. It writes:

`web/test-results/phase0-baseline.json`

Review p50/p75/p95 TTFB, FCP, LCP, INP and CLS against
[`../perf/baseline.md`](../perf/baseline.md). A zero INP means that no
qualifying interaction entry was observed; it is not proof of zero
latency.

The fixture separates browser cold/warm and proxy
`MISS`/`HIT`/`STALE`/`BYPASS`. Runtime logs provide the remaining split:

- `core`: DB fresh, stale, missing and provider-fetch counters;
- `proxy`: cache status and bounded caller (`web` or `core`);
- `web`: session bootstrap, outbound split and normalized Web Vitals.

Never combine deterministic fixture measurements with deployed browser
measurements. A deployed run must record target, commit SHA, region,
cache state, browser/device, fixture account and sample count.

## Phase 4 Release Gate

Before asking to close roadmap issue #35:

1. Run `make validate-web`, `make validate-core`, and
   `make validate-proxy`.
2. Run `make e2e-web`, `make e2e-web-regressions`, and
   `make e2e-web-performance`.
3. Run
   `pnpm exec playwright test --project=accessibility-responsive` from
   `web/`.
4. Confirm the smoke observes exact `MISS`, `HIT`, and `STALE` values in
   both `X-Cache` and `Server-Timing`.
5. Deploy the exact validated SHA to staging, rerun the critical
   desktop/mobile/keyboard/degraded matrix with the dedicated fixture
   account, and record target, region, SHA, device, and cache state.
6. Promote the same SHA, repeat the productive smoke with that
   non-personal account, and monitor the thresholds in
   [`../perf/baseline.md`](../perf/baseline.md) through the agreed
   observation window.

Local fixture evidence cannot satisfy steps 5–6 and must never be
relabeled as staging or production evidence.

## CI

- `.github/workflows/monorepo-ci.yml` runs the desktop production-build
  smoke for pull requests that touch `web`.
- `.github/workflows/browser-baseline.yml` runs weekly and on demand,
  regenerates the baseline, executes quarantined regressions and uploads
  all available artifacts for 30 days.

On failure, download the workflow artifact and start with `trace.zip`,
then correlate the recorded `X-Request-Id` with structured service logs.
