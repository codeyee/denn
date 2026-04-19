# Project Documentation Memory

`.docs/` is the central memory for the repo. It should describe the
current system, the work already shipped, the debt that is still active,
the plans that are still open, and the contracts that multiple services
must obey.

This folder is optimized for two readers:

- contributors who need to understand the current architecture quickly;
- agents that need one canonical place to recover project context.

## Read Order

Start here, then read in this order:

1. [`architecture/current-state.md`](./architecture/current-state.md)
2. [`features/implemented.md`](./features/implemented.md)
3. [`technical-debt.md`](./technical-debt.md)
4. [`roadmap/open-plans.md`](./roadmap/open-plans.md)
5. [`adr/0001-external-metadata-integration.md`](./adr/0001-external-metadata-integration.md)
6. [`adr/0002-web-auth-cookies.md`](./adr/0002-web-auth-cookies.md)
7. [`contracts/internal-http.md`](./contracts/internal-http.md)
8. [`observability.md`](./observability.md)
9. [`workspace-operating-model.md`](./workspace-operating-model.md)

Use the rest as specialized references:

- [`architecture/data-fetching.md`](./architecture/data-fetching.md)
- [`architecture/auth-session-bootstrap.md`](./architecture/auth-session-bootstrap.md)
- [`architecture/content-lifecycle.md`](./architecture/content-lifecycle.md)
- [`perf/baseline.md`](./perf/baseline.md)
- [`runbooks/rehydrate-content.md`](./runbooks/rehydrate-content.md)
- [`history/implementation-history.md`](./history/implementation-history.md)
- [`definition-of-done.md`](./definition-of-done.md)

## Structure

- `architecture/`
  Current behavior that is already merged and should stay aligned with
  the code.
- `features/implemented.md`
  Shipped capabilities and platform foundations that new contributors
  can rely on.
- `technical-debt.md`
  Active debt only. Resolved debt should not stay here.
- `roadmap/open-plans.md`
  Condensed view of what is still open, partially implemented, or next.
- `sprints/`
  Detailed execution plans that are still open or future-facing.
  Completed sprint plans do not stay here.
- `history/implementation-history.md`
  Historical summary of what shipped, extracted from completed sprint
  plans.
- `adr/`
  Architecture decisions and their tradeoffs.
- `contracts/`
  Cross-service contracts and invariants.
- `perf/`
  Performance baselines and thresholds.
- `runbooks/`
  Operational procedures.

## Update Rules

- `architecture/*` describes merged behavior only, not aspirations.
- `roadmap/open-plans.md` links to the detailed plans still in play.
- When a sprint or plan is completed:
  - extract the durable outcome into `architecture/*`,
    `features/implemented.md`, `technical-debt.md`, and/or
    `history/implementation-history.md`;
  - update `roadmap/open-plans.md`;
  - delete the stale done plan from `sprints/`.
- New cross-service behavior belongs in an ADR or in the internal
  contract before it becomes tribal knowledge.
- If a document is no longer useful after its information has been
  absorbed elsewhere, remove it instead of keeping parallel narratives.
