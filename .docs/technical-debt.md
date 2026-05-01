# Technical Debt

Only active debt belongs here. Resolved issues should be removed once
their lasting outcome is reflected in architecture or history docs.

## Critical

- Frontend auth still depends on JS-readable cookies and in-memory JWT
  handling.
  Reference:
  [`adr/0002-web-auth-cookies.md`](./adr/0002-web-auth-cookies.md)
  and
  [`architecture/auth-session-bootstrap.md`](./architecture/auth-session-bootstrap.md)
- Protected-route redirect remains client-side; no Next middleware guard
  exists yet.
  Reference:
  [`roadmap/open-plans.md`](./roadmap/open-plans.md)

## High

- `perf/baseline.md` still contains mostly placeholder values, so the
  repo has performance rules without a maintained measured baseline.
- Static `CONTENT_REHYDRATION_TTL` is still the freshness policy for
  local content details. This is too coarse for newly released content.
- Cross-service typed contract generation is still duplicated across
  `web` and `core`; there is no generated shared client or schema layer.
- Frontend Query migration now has only smoke-level automated coverage;
  Add-to-List and ListDetail need broader interaction tests.

## Medium

- Some frontend coordination modules remain large and still mix loading,
  transformation, and orchestration concerns.
- `browse_metadata` has a working base model, but its refresh strategy
  is still lighter than the main local detail lifecycle.
- The auth bootstrap policy needs stronger automated coverage and a
  canonical `next` redirect flow after login.

## Notes

- This document is the working set for debt that still matters.
- Historical diagnostics from the original audit were intentionally
  absorbed into this file, the roadmap, and the architecture docs so
  they do not live on as parallel narratives.
