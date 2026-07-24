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
7. [`adr/0003-migrate-web-from-nextjs-to-tanstack-start.md`](./adr/0003-migrate-web-from-nextjs-to-tanstack-start.md)
8. [`contracts/internal-http.md`](./contracts/internal-http.md)
9. [`observability.md`](./observability.md)
10. [`workspace-operating-model.md`](./workspace-operating-model.md)

## Practical Usage Flow

Use this flow when you need context quickly:

1. If you want to understand the repo:
   `README.md` -> `.docs/README.md`
2. If you want to know how the system works today:
   `architecture/current-state.md`
3. If you want to know what already exists:
   `features/implemented.md`
4. If you want to know what comes next:
   `roadmap/open-plans.md`
5. If you are about to execute or verify something sensitive:
   `runbooks/`
6. If you are changing a structural decision:
   `adr/`
7. If you are evaluating an idea that is not approved yet:
   `ideas/`

## How To Resume Work

Do not jump straight into the first sprint file.

Recommended restart flow for contributors and agents:

1. Read `README.md`.
2. Read `.docs/README.md`.
3. Read `architecture/current-state.md`.
4. Read `features/implemented.md`.
5. Read `technical-debt.md`.
6. Read `roadmap/open-plans.md`.
7. Only then open the first relevant active sprint under `sprints/`.

Why:

- `open-plans.md` tells you priority and sequencing.
- `technical-debt.md` tells you which quality constraints are still
  active.
- active sprint docs give detailed execution context only after you
  already understand the current system state.

Rule:

- start with `open-plans.md` to choose the workstream;
- then read the relevant sprint doc;
- then read any referenced `architecture/`, `adr/`, `runbooks/`, or
  `ideas/` documents needed for that specific task.

## Canonical Sources Of Truth

Use these documents for day-to-day engineering decisions:

- `architecture/current-state.md`
- `features/implemented.md`
- `technical-debt.md`
- `roadmap/open-plans.md`
- `sprints/*` for still-open execution detail
- `history/implementation-history.md` for already-shipped outcomes

## What Each Category Means

- `README.md` at repo root
  Fast project overview for humans landing in the repo.
- `.docs/README.md`
  Documentation index and taxonomy. Read this when you are unsure where
  something belongs.
- `architecture/*`
  How the system works today after merge. These docs describe current
  behavior, not proposals.
- `adr/*`
  Architecture Decision Records. Use them for major cross-service or
  cross-layer decisions and their tradeoffs.
- `features/implemented.md`
  Shipped baseline. If a capability is real and merged, it should be
  representable here.
- `technical-debt.md`
  Active engineering debt that still matters. Not feature backlog, not
  historical notes.
- `ideas/*`
  Raw or semi-structured ideas. These are inputs, not commitments. If
  an idea is accepted, it should be absorbed into a sprint or canonical
  doc and stop living only here.
- `roadmap/open-plans.md`
  Condensed action order. Use this to decide what to attack next.
- `roadmap/YYYY-MM-DD-*.md`
  Dated product analysis or strategy references. Useful context, but
  secondary to current architecture and active sprint docs.
- `sprints/*`
  Detailed execution plans for open or future work. When a sprint is
  finished, extract durable outcomes and remove the stale done plan.
- `runbooks/*`
  Operational procedures. Use these when running, debugging, verifying,
  or rolling out a system behavior.
- `history/implementation-history.md`
  Durable summary of what already shipped, after detailed sprint docs
  are retired.
- `definition-of-done.md`
  Cross-cutting quality gate for every change. It is separated on
  purpose because it applies to all services and all work, not to one
  feature area.

## ADR vs Architecture

- `architecture/*` answers: "How does the system work right now?"
- `adr/*` answers: "Why was a major structural decision made, and what
  alternatives were considered?"

Use `architecture/*` when implementing or debugging current behavior.
Use `adr/*` when changing boundaries, responsibilities, or fundamental
technical direction.

## Open Plans vs Sprints vs Debt vs Ideas

- Use `roadmap/open-plans.md` to understand priority and action order.
- Use `sprints/*` when you need the detailed plan for one open workstream.
- Use `technical-debt.md` for quality gaps that still need repayment but
  are not themselves a full feature sprint.
- Use `ideas/*` for uncommitted design material or future options.

Rule of thumb:

- if work is approved and sequenced, it belongs in `open-plans.md` and
  likely in a sprint doc;
- if it is a concrete execution plan, it belongs in `sprints/`;
- if it is a structural quality problem without its own feature plan, it
  belongs in `technical-debt.md`;
- if it is still speculative, it belongs in `ideas/`.

## When To Use Runbooks

Runbooks are for operational tasks, not design.

Examples:

- how to run a refresh job;
- how to validate a session bootstrap flow manually;
- how to stagger a rollout;
- how to verify a known production-sensitive path.

If the question is "how do I operate or verify this?", check `runbooks/`.
If the question is "how should this be designed?", check
`architecture/`, `adr/`, `open-plans`, or a sprint doc.

Use the rest as specialized references:

- [`architecture/data-fetching.md`](./architecture/data-fetching.md)
- [`architecture/auth-session-bootstrap.md`](./architecture/auth-session-bootstrap.md)
- [`architecture/client-rehydration.md`](./architecture/client-rehydration.md)
- [`architecture/content-lifecycle.md`](./architecture/content-lifecycle.md)
- [`architecture/content-rehydration-policy.md`](./architecture/content-rehydration-policy.md)
- [`architecture/content-eligibility.md`](./architecture/content-eligibility.md)
- [`roadmap/2026-04-19-social-multimedia-tracker-review.md`](./roadmap/2026-04-19-social-multimedia-tracker-review.md)
- [`roadmap/2026-04-20-mvp-functional-design.md`](./roadmap/2026-04-20-mvp-functional-design.md)
- [`roadmap/2026-04-20-post-foundation-mvp-feature-roadmap.md`](./roadmap/2026-04-20-post-foundation-mvp-feature-roadmap.md)
- [`perf/baseline.md`](./perf/baseline.md)
- [`runbooks/spotify-token-mode.md`](./runbooks/spotify-token-mode.md)
- [`runbooks/rehydrate-content.md`](./runbooks/rehydrate-content.md)
- [`runbooks/client-session-bootstrap-smoke.md`](./runbooks/client-session-bootstrap-smoke.md)
- [`runbooks/auth-bff-rollout.md`](./runbooks/auth-bff-rollout.md)
- [`runbooks/browser-e2e-and-baseline.md`](./runbooks/browser-e2e-and-baseline.md)
- [`runbooks/homepage-cache-warmup.md`](./runbooks/homepage-cache-warmup.md)
- [`history/implementation-history.md`](./history/implementation-history.md)
- [`definition-of-done.md`](./definition-of-done.md)

Historical strategy notes:

- The dated files under `roadmap/` are product strategy references.
- They may contain older implementation-path examples from before the
  TanStack Start migration.
- When they disagree with current code layout or route structure, trust
  `architecture/current-state.md`, the active `sprints/`, and
  `AGENTS.md`.

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
- `roadmap/YYYY-MM-DD-*.md`
  Historical or strategic product analysis. Useful context, but not the
  primary source of technical truth.
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
