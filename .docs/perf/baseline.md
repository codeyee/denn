# Performance Baseline

This document is the source of truth for performance measurement on the
critical login, home, search, detail, lists, private-profile, and
public-profile flows.

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
Phase 0 does not invent production percentiles for them. The comparable
deployed Home after-measurement is recorded below; the deterministic
fixture remains the broader six-flow engineering floor.

## Phase 4 Deployed After Snapshot

Captured 2026-07-24 against `https://denn.codeyee.dev/` after release
`52951909f4483dd9f667c3e026ad09bdf8e83533`, using headed Chrome at
1200 × 900, the dedicated non-personal fixture account, five fresh
authenticated browser contexts, and one warm reload in each context.
The pause-carousel interaction supplied a qualifying INP event.

Values below are milliseconds except CLS.

| Flow | State | TTFB p50/p75/p95 | FCP p50/p75/p95 | LCP p50/p75/p95 | INP p50/p75/p95 | CLS p50/p75/p95 | Data/cache state |
|---|---|---|---|---|---|---|---|
| Home | browser cold | 760.8 / 891.8 / 1,091.2 | 988 / 1,124 / 1,236 | 1,724 / 1,948 / 1,986.4 | 24 / 24 / 24 | 0.0001 / 0.0001 / 0.0001 | fresh browser context; authenticated SSR |
| Home | browser warm | 393.8 / 435.5 / 439.7 | 432 / 472 / 472 | 924 / 1,032 / 1,204.8 | 24 / 24 / 24 | 0 / 0 / 0 | same-context browser cache |

The matching BFF cache probe recorded
`proxy;dur=1235.51;desc="MISS"` followed by
`proxy;dur=51.02;desc="HIT"` in `Server-Timing`. Both satisfy #24's
agreed proxy budgets: partial cold miss below 2.5 seconds and warm hit
below 500 ms. Home also satisfies the browser release gates at p75:
LCP 1.948 seconds, INP 24 ms, and CLS 0.0001 cold; LCP 1.032 seconds,
INP 24 ms, and CLS 0 warm.

The broader production smoke covered registration, hard-reload session
continuity, search, keyboard id-first navigation, detail, back,
safe-default and opted-in direct search, CSRF rejection, transient Core
failure, 390 × 844 mobile reflow, reduced motion, logout, and login.
The account preference was restored to `Off`, temporary credentials
were removed from browser storage, and the visible browser remained
authenticated. The operational observation ran from 13:41 through
14:18 UTC; the final Web SHA was publicly confirmed before the last
smoke.

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

## Phase 1 Local After Snapshot

Captured 2026-07-24 with the same production-build fixture method after
the Phase 1 auth, navigation, local-first detail, and aggregate-cache
changes. This is a local comparison point; it does not replace the
deployed before snapshot above.

| Flow | State | TTFB p50/p75/p95 | FCP p75 | LCP p50/p75/p95 | INP p75/p95 | CLS p75/p95 |
|---|---|---|---:|---|---|---|
| Login | cold | 6.8 / 10.2 / 15.4 | 32 | 472 / 476 / 480 | 0 / 0 | 0 / 0 |
| Login | warm | 6.5 / 7.4 / 7.9 | 44 | 44 / 44 / 56 | 0 / 0 | 0 / 0 |
| Home | cold | 15.9 / 17.7 / 30.8 | 44 | 44 / 44 / 56 | 0 / 0 | 0 / 0 |
| Home | warm | 16.5 / 16.6 / 18.2 | 60 | 60 / 60 / 68 | 0 / 0 | 0 / 0 |
| Search | cold | 13.9 / 14.0 / 18.3 | 40 | 36 / 40 / 40 | 0 / 0 | 0 / 0 |
| Search | warm | 13.7 / 15.5 / 18.0 | 56 | 56 / 56 / 60 | 0 / 0 | 0 / 0 |
| Detail | cold | 9.7 / 9.7 / 14.3 | 32 | 84 / 88 / 92 | 0 / 0 | 0 / 0 |
| Detail | warm | 9.9 / 10.5 / 10.9 | 48 | 72 / 72 / 72 | 0 / 0 | 0 / 0 |
| Lists | cold | 7.1 / 9.1 / 15.4 | 84 | 100 / 104 / 112 | 0 / 0 | 0.04 / 0.04 |
| Lists | warm | 6.6 / 6.6 / 7.1 | 68 | 80 / 80 / 88 | 0 / 0 | 0.04 / 0.04 |
| Profile | cold | 6.2 / 6.6 / 6.7 | 68 | 68 / 68 / 68 | 0 / 0 | 0 / 0 |
| Profile | warm | 4.6 / 4.7 / 5.2 | 60 | 56 / 60 / 64 | 0 / 0 | 0 / 0 |

The browser regression suite separately measures the first visible
navigation feedback and requires it in less than 100 ms. The detail
backend request prefetches identity, rating, and related detail rows in
six queries, below the repository's `query_count <= 10` list-path
ceiling, and performs no per-item provider waterfall.

## Phase 2 Local After Snapshot

Captured 2026-07-24 with the same production-build fixture method after
semantic responsive media, stable hero geometry, reduced-motion and
responsive accessibility changes. Five fresh contexts per state were
used; raw evidence remains in
`web/test-results/phase0-baseline.json`.

| Flow | State | TTFB p50/p75/p95 | FCP p75 | LCP p50/p75/p95 | INP p75/p95 | CLS p75/p95 |
|---|---|---|---:|---|---|---|
| Login | cold | 5.2 / 7.4 / 12.3 | 28 | 28 / 28 / 36 | 0 / 0 | 0 / 0 |
| Login | warm | 5.2 / 5.7 / 7.6 | 40 | 40 / 40 / 40 | 0 / 0 | 0 / 0 |
| Home | cold | 16.3 / 19.0 / 32.5 | 48 | 44 / 48 / 60 | 0 / 16 | 0 / 0 |
| Home | warm | 19.3 / 19.9 / 20.3 | 64 | 64 / 64 / 68 | 16 / 16 | 0 / 0 |
| Search | cold | 15.4 / 16.0 / 16.4 | 36 | 36 / 36 / 36 | 0 / 0 | 0 / 0 |
| Search | warm | 13.4 / 13.4 / 14.2 | 56 | 56 / 56 / 56 | 0 / 0 | 0 / 0 |
| Detail | cold | 9.7 / 11.2 / 13.5 | 32 | 92 / 92 / 92 | 0 / 0 | 0 / 0 |
| Detail | warm | 9.9 / 10.0 / 10.3 | 48 | 68 / 72 / 72 | 0 / 0 | 0 / 0 |
| Lists | cold | 7.9 / 8.0 / 13.0 | 84 | 100 / 100 / 104 | 0 / 0 | 0.03 / 0.03 |
| Lists | warm | 6.5 / 6.6 / 6.7 | 68 | 80 / 80 / 88 | 0 / 0 | 0.03 / 0.03 |
| Profile | cold | 6.9 / 7.0 / 7.4 | 68 | 68 / 68 / 72 | 0 / 0 | 0 / 0 |
| Profile | warm | 5.6 / 5.8 / 7.8 | 68 | 64 / 68 / 72 | 0 / 24 | 0 / 0 |

Home remains comfortably within the release budgets at p75:
LCP 48 ms cold / 64 ms warm, CLS 0, and INP 0 ms cold / 16 ms warm.

The deterministic three-item media fixture also records the cold request
burst before autoplay approaches the next slide:

| Home media behavior | Image requests | Payload bytes |
|---|---:|---:|
| Legacy-equivalent active plus two hidden hero slides | 6 | 1,944 |
| Phase 2 active hero plus three visible card posters | 4 | 1,296 |

That is a measured 33.3% reduction in both requests and payload bytes for
the controlled fixture. The original deployed audit observed 114–125
CSS-initiated image resources but did not preserve raw byte totals, so
this document does not invent a production-byte comparison. The
production-build test additionally proves that inactive hero artwork is
not requested during the first second and is only loaded when its
five-second activation approaches.

## Phase 4 Local Release-Candidate Snapshot

Captured 2026-07-24 from the release-candidate branch after the Phase 3
BFF/HttpOnly auth migration and the final degraded-detail recovery
gate. The method and sample count are unchanged: five fresh contexts and
five warm reloads per flow against the deterministic production bundle.
Raw evidence remains in `web/test-results/phase0-baseline.json`.

| Flow | State | TTFB p50/p75/p95 | FCP p75 | LCP p50/p75/p95 | INP p75/p95 | CLS p75/p95 |
|---|---|---|---:|---|---|---|
| Login | cold | 6.2 / 6.9 / 11.6 | 36 | 464 / 468 / 472 | 0 / 0 | 0 / 0 |
| Login | warm | 6.4 / 7.2 / 7.6 | 48 | 44 / 48 / 464 | 0 / 0 | 0 / 0 |
| Home | cold | 19.4 / 32.8 / 35.3 | 64 | 48 / 64 / 64 | 16 / 16 | 0 / 0 |
| Home | warm | 17.4 / 17.8 / 18.3 | 60 | 60 / 60 / 64 | 16 / 16 | 0 / 0 |
| Search | cold | 14.7 / 14.7 / 15.9 | 36 | 36 / 36 / 36 | 0 / 0 | 0 / 0 |
| Search | warm | 13.5 / 13.7 / 14.2 | 52 | 48 / 52 / 52 | 0 / 16 | 0 / 0 |
| Detail | cold | 8.7 / 10.8 / 14.6 | 32 | 92 / 92 / 100 | 0 / 0 | 0 / 0 |
| Detail | warm | 9.6 / 9.8 / 10.5 | 48 | 68 / 72 / 72 | 0 / 0 | 0 / 0 |
| Lists | cold | 7.1 / 8.3 / 13.1 | 88 | 100 / 104 / 104 | 0 / 0 | 0.03 / 0.03 |
| Lists | warm | 6.7 / 7.0 / 7.4 | 72 | 80 / 80 / 92 | 16 / 24 | 0.03 / 0.03 |
| Profile | cold | 4.9 / 5.3 / 6.5 | 72 | 72 / 72 / 76 | 0 / 0 | 0 / 0 |
| Profile | warm | 5.1 / 5.1 / 11.9 | 60 | 60 / 60 / 64 | 0 / 0 | 0 / 0 |

The local release gates passed with Home p75 LCP 64 ms in both states,
INP 16 ms, and CLS 0. The full browser matrix also proved exact
`MISS`, `HIT`, and `STALE` propagation through the BFF and
`Server-Timing`, bounded 5-second detail failure with an explicit retry,
desktop/mobile session continuity, and absence of the named React 418,
hover-write, unnamed-control, and transient-logout regressions.

These remain fixture results rather than deployed measurements. The
separate deployed after snapshot above closes the operational Phase 4
gate without relabeling or combining the two data sources.

## Personal Tracking And Public Profile Local Snapshot

Captured 2026-07-24 from the production Nitro bundle after Personal
Tracking 1.0 and Public Profiles 1.0. The existing performance target
ran five fresh contexts and five same-context warm reloads per flow.

| Flow | State | TTFB p50/p75/p95 | FCP p75 | LCP p50/p75/p95 | INP p75/p95 | CLS p75/p95 |
|---|---|---|---:|---|---|---|
| Public profile `/user/phase0-fixture` | cold | 14.0 / 15.3 / 18.2 | 44 | 44 / 44 / 48 | 0 / 0 | 0 / 0 |
| Public profile `/user/phase0-fixture` | warm | 24.4 / 27.2 / 32.9 | 80 | 80 / 80 / 88 | 0 / 0 | 0 / 0 |
| Private profile `/profile` | cold | 4.6 / 5.4 / 7.9 | 80 | 80 / 80 / 84 | 0 / 0 | 0 / 0 |
| Private profile `/profile` | warm | 10.0 / 10.1 / 11.5 | 88 | 76 / 88 / 88 | 0 / 0 | 0 / 0 |

The `/profile` rows are retained as historical evidence for the
2026-07-24 snapshot. The current private surface is `/settings`, while
public-profile editing is an in-page modal at `/user/<username>`. The
repeatable browser baseline now measures `settings` instead of the
removed private-profile route; its values must not be compared to the
historical rows until a new snapshot is captured.

Both measured profile surfaces passed the release gates by a wide margin in the
deterministic fixture: p75 LCP below 2.5 seconds, INP below 200 ms, and
CLS below 0.10. As elsewhere in this document, a zero INP means no
qualifying event-duration entry was emitted.

A separate in-process Core check used a migrated temporary SQLite
database, one completed/rated/favorite item, one public list, five
warmups, and 100 successful anonymous overview reads. It recorded
2.73 ms p50, 3.01 ms p95, and 12.85 ms max. This is a local application
floor, not a network or production latency claim. The contract tests
independently enforce `query_count <= 10` for overview and every public
tab and assert zero calls to `proxy`.

## Public Catalog Foundation Local Snapshot

Captured 2026-07-24 after making Home, Search and Content Detail
available without login. The production-build fixture method is
unchanged: five fresh anonymous contexts and one warm reload per
context. Authenticated flows remain separate in the generated artifact;
these values describe only the new public boundary.

| Public flow | State | TTFB p50/p75/p95 | FCP p75 | LCP p50/p75/p95 | INP p75/p95 | CLS p75/p95 |
|---|---|---|---:|---|---|---|
| Home | cold | 16.8 / 17.1 / 17.2 | 44 | 44 / 44 / 44 | 16 / 16 | 0 / 0 |
| Home | warm | 18.0 / 18.1 / 18.3 | 64 | 60 / 64 / 64 | 16 / 16 | 0 / 0 |
| Search | cold | 16.1 / 16.4 / 18.0 | 40 | 40 / 40 / 40 | 0 / 0 | 0 / 0 |
| Search | warm | 19.3 / 22.4 / 24.0 | 68 | 68 / 68 / 76 | 0 / 0 | 0 / 0 |
| Detail | cold | 9.5 / 14.1 / 15.3 | 44 | 36 / 44 / 44 | 0 / 0 | 0 / 0 |
| Detail | warm | 10.7 / 15.9 / 16.1 | 60 | 56 / 60 / 64 | 0 / 0 | 0 / 0 |

All three public flows remain comfortably inside the existing browser
and route thresholds. The matching browser tests also verify that
client navigation never calls the internal Core URL and never carries
`X-Api-Key`; stable-id resolution remains server-to-server.

## Authentication Surface Consolidation Local Snapshot

Captured 2026-07-25 from the production Nitro bundle after retiring
`/welcome` and moving its cover-gallery language into login and
registration. The standard fixture method remained unchanged: five
fresh anonymous contexts and one same-context warm reload per sample.

| Flow | State | TTFB p50/p75/p95 | FCP p75 | LCP p50/p75/p95 | INP p75/p95 | CLS p75/p95 |
|---|---|---|---:|---|---|---|
| Login | cold | 13.4 / 13.9 / 481.7 | 56 | 756 / 792 / 1,668 | 176 / 192 | 0.07 / 0.07 |
| Login | warm | 33.6 / 46.3 / 65.1 | 252 | 428 / 476 / 732 | 184 / 224 | 0.07 / 0.07 |

At this snapshot, the decorative gallery added one same-origin,
filesystem-backed `/api/cards` manifest and static card media; it added
no Core or Proxy request. The TV-noise layer still used its original
opacity and refresh rate. Login remained within the shared p75 release
gates: LCP 792 ms cold / 476 ms warm, INP 176 / 184 ms, and CLS 0.07.

## Authentication Backdrop Optimization Local After Snapshot

Captured 2026-07-25 from the production Nitro bundle after replacing
the animated authentication backdrop with a stable, static dome. The
standard fixture method used five fresh anonymous contexts and one
same-context warm reload per sample.

| Flow | State | TTFB p50/p75/p95 | FCP p75 | LCP p50/p75/p95 | INP p75/p95 | CLS p75/p95 |
|---|---|---|---:|---|---|---|
| Login | cold | 3.9 / 4.1 / 11.8 | 28 | 96 / 108 / 136 | 0 / 0 | 0 / 0 |
| Login | warm | 7.7 / 10.1 / 10.6 | 64 | 100 / 104 / 108 | 24 / 24 | 0 / 0 |

The production-build comparison improved login p75 LCP from 792 to
108 ms cold and from 476 to 104 ms warm. INP moved from 176/184 ms to
0/24 ms, and CLS moved from 0.07 to 0 in both states.

A separate fresh-headless-Chrome sample against the local Vite stack
isolated five seconds of steady-state runtime work. These
development-mode values explain the CPU improvement; they are not
combined with the production-build percentiles above.

| Steady-state login signal | Before | After |
|---|---:|---:|
| Main-thread task duration over 5 s | 1,241.389 ms | 0.122 ms |
| Style recalculations over 5 s | 599 | 0 |
| DOM elements | 1,548 | 1,200 |
| Gallery image elements | 175 | 60 |
| Animated canvases | 1 | 0 |
| Cold-load CLS | 0.19926 | 0.00037 |

At that snapshot, the backdrop kept the curved cover-gallery composition
with 12 segments, limited source variety to 24 images, and rendered 60
static tiles. It no longer ran a permanent animation frame loop,
regenerated TV-noise pixels, applied a viewport-sized blur, or promoted
the sphere with `will-change`.

The homepage featured banner now follows the same rule: it keeps one
active responsive image for full-bleed artwork, and poster-only slides
use the bounded two-copy ambient/foreground treatment. It keeps the
content gradients and bounded crossfade and does not mount the
continuously refreshed TV-noise canvas. The recorded fixture used a
full-bleed item: a five-second local steady-state check recorded zero
canvases, one active banner image, and 79.675 ms of main-thread task time
including one scheduled carousel rotation. No comparable pre-change
runtime sample was retained, so this is a regression point rather than a
before/after claim.

## Dynamic Collections Performance Contract

Dynamic collections are authenticated Core reads over persisted
`UserContentTracking`; they must not invoke `proxy`. Metadata counts are
aggregated in one grouped tracking query, and collection pages fetch local
content summaries with bounded pagination. The random picker uses a count and
an indexed ordered offset instead of `ORDER BY RANDOM()`.

No browser percentile is recorded yet because the deterministic fixture does
not currently seed these user-owned collection routes. Before production
measurement, extend that fixture and capture cold/warm `/collections/backlog`
results under the same LCP, INP, and CLS gates used for Lists.

## Authentication Mosaic Asset Optimization Local After Snapshot

Captured 2026-07-26 from the production Nitro bundle after replacing the
static dome with the flat moving mosaic and optimizing its dedicated
cover assets. The asset gate now enforces 150 WebP files, a maximum
384 × 576 size, 2:3 composition, per-file and total byte budgets, and
balanced media categories.

Five fresh anonymous desktop contexts produced:

| Flow | State | TTFB p50/p75/p95 | FCP p75 | LCP p50/p75/p95 | CLS p75/p95 |
|---|---|---|---:|---|---|
| Login | cold | 5.9 / 6.4 / 7.9 | 64 | 140 / 152 / 152 | 0.00023 / 0.00023 |

A representative fresh-context comparison and one same-context reload
isolated the asset and cache changes:

| Login asset signal | Before | After |
|---|---:|---:|
| Source card directory | 11,643,029 bytes | 3,539,278 bytes |
| Cold card transfer | 1,874,883 bytes | 599,902 bytes |
| Cold total route transfer | 3,112,181 bytes | 1,828,779 bytes |
| Card manifest body | 10,263 bytes / 150 entries | 1,643 bytes / 24 entries |
| Warm card transfer | 1,363,743 bytes | 0 bytes |
| Warm manifest transfer | 10,563 bytes | 0 bytes |

The manifest is private-cached for one hour and keeps one randomized
24-card selection stable during that window. Card files use a seven-day
public cache with stale-while-revalidate. The mosaic still renders five
CSS-transform tracks, performs no steady-state layout, respects reduced
motion, and stays outside the accessibility tree.

The equivalent 390 × 844, DPR 2, emulated-3G sample improved the final
card response from 16,650 ms to 9,398 ms and LCP from 9,368 ms to
7,244 ms; FCP remained 1,452 ms. The remaining slow-network LCP is a
decorative mosaic image rather than the login form. It remains explicit
performance debt for a future adaptive-loading policy; fast-network LCP
stays comfortably below the 2.5-second release threshold.

## Discovery Density And Card Preview Local Snapshot

Captured 2026-07-26 from the production Nitro fixture after increasing
homepage discovery to at most 30 items for each of the five supported
media categories, adding the Books carousel to the shared section
configuration, and making card previews anchor-aware. Five fresh
contexts and five same-context reloads were used for each flow.

| Flow | State | TTFB p50/p75/p95 | FCP p75 | LCP p50/p75/p95 | INP p75/p95 | CLS p75/p95 |
|---|---|---|---:|---|---|---|
| Public Home | cold | 17.1 / 21.9 / 48.6 | 52 | 52 / 52 / 88 | 0 / 0 | 0 / 0 |
| Public Home | warm | 24.9 / 31.5 / 33.4 | 84 | 80 / 84 / 84 | 0 / 16 | 0 / 0 |
| Authenticated Home | cold | 18.9 / 18.9 / 23.1 | 56 | 56 / 56 / 64 | 0 / 0 | 0 / 0 |
| Authenticated Home | warm | 26.3 / 29.0 / 35.9 | 84 | 80 / 84 / 84 | 0 / 0 | 0 / 0 |
| Public Profile | cold | 18.2 / 18.7 / 31.7 | 60 | 56 / 60 / 72 | 0 / 0 | 0 / 0 |
| Public Profile | warm | 31.2 / 31.8 / 32.1 | 88 | 88 / 88 / 92 | 0 / 0 | 0 / 0 |

All measured p75 values remain inside the shared release thresholds.
The denser Home keeps one aggregate Proxy request and one bulk Core
identity-resolution request rather than issuing per-card calls. The
Core bulk cap is 200, which covers the worst-case 150 homepage
identities in one request.

Card capability observation is shared across all cards. The scroll
dismissal listener, resize work, Escape handling, animation-frame
positioning, and `ResizeObserver` subscriptions exist only while one
preview is active, so the larger DOM does not add one set of global
listeners per card. The preview has no internal scroll surface and does
not retain wheel input. Images remain lazy except for the active
featured asset.

A separate live-stack smoke rendered 19 movie, 20 TV, 30 game, and
30 album items and resolved all 99 identities in one Core request.
OpenLibrary timed out at its bounded provider timeout and the Books
category degraded to empty; deterministic browser coverage verifies
that the real OpenLibrary-shaped category renders when results exist.
The live observation is operational evidence, not combined with the
fixture percentiles above.

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

## Dynamic System Lists

The first authenticated lists read lazily materializes the ten system-managed
lists in bulk. The steady-state list endpoint remains bounded at eight queries:
the existing list read, one system-list existence check, and the two user
preference reads that control system-list visibility. Synchronization uses one
tracking read, one existing-items read, and bulk writes only when a tracking
mutation changes membership.

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
