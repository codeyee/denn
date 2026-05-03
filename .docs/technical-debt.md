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

## High

- `perf/baseline.md` still contains mostly placeholder values, so the
  repo has performance rules without a maintained measured baseline.
- Cross-service typed contract generation is still duplicated across
  `web` and `core`; there is no generated shared client or schema layer.
- Frontend Query migration now has only smoke-level automated coverage;
  Add-to-List and ListDetail need broader interaction tests.
- Country-scoped streaming availability is persisted separately, but
  freshness is still tied to the global content detail lifecycle instead
  of an independent per-country policy.
- `core` still persists some provider-derived semantics such as external
  `status`, which pulls the local model toward upstream vocabularies
  instead of a Denn-owned domain shape.

## Medium

- Some frontend coordination modules remain large and still mix loading,
  transformation, and orchestration concerns.
- `browse_metadata` has a working base model, but its refresh strategy
  is still lighter than the main local detail lifecycle.
- The auth bootstrap policy still lacks full browser-level E2E coverage,
  even though route-level redirects and `next` login redirects are now
  formalized.

## Notes

- This document is the working set for debt that still matters.
- Historical diagnostics from the original audit were intentionally
  absorbed into this file, the roadmap, and the architecture docs so
  they do not live on as parallel narratives.
