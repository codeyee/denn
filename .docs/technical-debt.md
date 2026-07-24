# Technical Debt

Only active debt belongs here. Resolved issues should be removed once
their lasting outcome is reflected in architecture or history docs.

## High

- Cross-service typed contract generation is still duplicated across
  `web` and `core`; there is no generated shared client or schema layer.
- Frontend Query migration has production-build smoke coverage for the
  critical routes, but Add-to-List and ListDetail still need broader
  mutation/rollback interaction tests.
- Adult search preference and cache isolation are implemented. IGDB,
  Spotify, and OpenLibrary still lack an equivalent trusted classifier;
  their results remain explicitly unclassified and Denn must not infer
  safety from free text.
- Country-scoped streaming availability is persisted separately, but
  freshness is still tied to the global content detail lifecycle instead
  of an independent per-country policy.
- `core` still persists some provider-derived semantics such as external
  `status`, which pulls the local model toward upstream vocabularies
  instead of a Denn-owned domain shape.

## Medium

- Some frontend coordination modules remain large and still mix loading,
  transformation, and orchestration concerns.
- Automated axe, keyboard, responsive, and touch-target coverage now
  protects the critical and legal routes. Less-used application
  surfaces still need the same coverage as they are changed.
- `browse_metadata` has a working base model, but its refresh strategy
  is still lighter than the main local detail lifecycle.
- Deployed before/after measurements still depend on a non-personal
  staging fixture and an agreed observation window. CI numbers are a
  deterministic engineering floor, not production latency. The Phase 4
  local release candidate is green but does not close this operational
  gap.

## Notes

- This document is the working set for debt that still matters.
- Historical diagnostics from the original audit were intentionally
  absorbed into this file, the roadmap, and the architecture docs so
  they do not live on as parallel narratives.
