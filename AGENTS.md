# Repository Guidelines

This file is the single canonical guide for agents and contributors working in this monorepo. Do not recreate per-service `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or hidden agent/editor metadata directories under `web/`, `core/`, or `proxy/`.

## Monorepo Topology

- `web/`: TanStack Start (Vite + Nitro) frontend plus the browser-facing BFF for metadata calls.
- `core/`: Django + DRF API for accounts, lists, ratings, invitations, and normalized content persistence.
- `proxy/`: Go + Gin metadata service; the only service that talks to TMDB, IGDB, Spotify, and OpenLibrary directly.
- `.docs/`: central project memory for architecture, implemented features, technical debt, roadmap, ADRs, contracts, runbooks, performance notes, and workspace policy.
- Root `Makefile` and `.scripts/`: full-stack development and validation entrypoints.

### Integration Boundaries

- Browser -> `web` BFF -> `proxy` for public metadata.
- Browser -> `core` for authenticated, user-owned data.
- `core` -> `proxy` for server-side enrichment and canonical metadata fetches.

Do not bypass these paths casually. If a change alters service ownership, request flow, or credentials handling, update the relevant ADR and shared docs in `.docs/`.

## Read Before Changing Architecture

Start with:

- `README.md`
- `.docs/README.md`
- `.docs/architecture/current-state.md`
- `.docs/features/implemented.md`
- `.docs/technical-debt.md`
- `.docs/roadmap/open-plans.md`
- `.docs/adr/0001-external-metadata-integration.md`
- `.docs/adr/0003-migrate-web-from-nextjs-to-tanstack-start.md`
- `.docs/contracts/internal-http.md`
- `.docs/workspace-operating-model.md`
- `AGENTS.md`

## Resume Flow

When retaking the project, do not jump straight into the first sprint
file.

Use this order:

1. `README.md`
2. `.docs/README.md`
3. `.docs/architecture/current-state.md`
4. `.docs/features/implemented.md`
5. `.docs/technical-debt.md`
6. `.docs/roadmap/open-plans.md`
7. the relevant active sprint under `.docs/sprints/`

Interpretation:

- `current-state.md` explains how the system works today.
- `features/implemented.md` tells you what is already baseline.
- `technical-debt.md` tells you what quality constraints still matter.
- `open-plans.md` tells you priority and sequencing.
- sprint docs provide detailed execution context only after the current
  state is understood.

Practical lookup flow:

1. To understand the repo: `README.md` -> `.docs/README.md`
2. To understand current behavior: `.docs/architecture/current-state.md`
3. To know what already exists: `.docs/features/implemented.md`
4. To know what comes next: `.docs/roadmap/open-plans.md`
5. To operate or verify a sensitive path: `.docs/runbooks/`
6. To change a structural decision: `.docs/adr/`
7. To evaluate something not yet approved: `.docs/ideas/`

## Root Commands

Use root `make` targets unless you are debugging a service in isolation.

- `make check`: verify Docker and reject non-local or inconsistent env configuration.
- `make setup-local`: prepare the Compose images and persistent PostgreSQL volume.
- `make up` / `make down`: start or stop PostgreSQL, Redis, `proxy`, `core`, and `web`; `down` preserves database data.
- `make status` / `make logs` / `make doctor`: inspect the local workspace.
- `make smoke-local`: exercise local HTTP, proxy auth, migrations, restored data, and loopback bindings.
- `make browser-local`: run Playwright against the real local stack.
- `make restart-web` / `make restart-core` / `make restart-proxy`: restart one service.
- `make env-store` / `make env-link`: reuse private env files across worktrees without committing them.
- `make test`: run the default backend suite (`proxy` + `core`).
- `make validate-web`: validate the auth-card asset budget, then run frontend
  lint + Vite production build.
- `make validate-core`: run Django tests.
- `make validate-proxy`: run Go tests.
- `make build-proxy`: verify the Go service builds cleanly.

Notes:

- `make validate-web` wraps the minimum CI gate for `web`. It validates the
  auth-card asset budget, runs ESLint and `vite build`; the build emits a Nitro
  bundle to `web/.output/`.
- `make validate-core` depends on a working test database and valid env configuration.
- `make validate-proxy` must stay deterministic and offline-safe by default.

### Local Agent Workflow

For application changes, use this sequence unless the task needs an isolated
test:

1. Run `make check`, then `make up`.
2. Make the change. Vite and Django reload bind-mounted source automatically.
3. Run `make restart-proxy` after Go changes.
4. Use only `http://127.0.0.1:3000`, `:8000`, and `:8080` for browser or
   `curl` verification.
5. Run `make smoke-local`; run `make browser-local` for browser-visible or
   cross-service behavior.

In a new worktree, run `make env-link` before `make check`. The canonical
procedure, including snapshot restore and failure recovery, is
`.docs/runbooks/local-development.md`.

Do not add a repository MCP server merely to wrap these commands. Make,
Compose, curl, and Playwright are the local automation contract for agents.
If an MCP integration is later proposed, it must add a capability that these
commands cannot provide and must not receive production credentials.

## Cross-Service Invariants

- `proxy` is the sole owner of upstream provider credentials.
- `PROXY_API_KEY` is server-only. Never expose it to the browser or add it to `window.__ENV__` (treat any `NEXT_PUBLIC_*` secret as forbidden).
- `core` is not a general-purpose metadata gateway.
- `proxy` must remain stateless with respect to PostgreSQL and user/session data.
- `X-Request-Id` propagation and the canonical error envelope are shared contracts across `core` and `proxy`.

If you change the error envelope or shared headers, update:

- `.docs/contracts/internal-http.md`
- `core/core/tests/test_error_envelope.py`
- `proxy/internal/handlers/common/response_test.go`

## Web Rules

The frontend has the strictest code-quality bar in the repo. Preserve it.

- TypeScript is strict. Avoid `any`, `@ts-ignore`, `@ts-expect-error`, and unnecessary type assertions.
- Prefer named exports. There are no framework-mandated default exports in TanStack Start; route files export a `Route` (and optionally `ServerRoute`) and the root route exports `Route` from `__root.tsx`.
- Treat ~150 lines as a refactor warning and 200 lines as a hard limit for React components. Split orchestration, hooks, and UI before adding more logic.
- Put shared UI in `web/src/components/common/`, page-specific UI in `web/src/components/pages/<Feature>/components/`, reusable hooks in `web/src/hooks/` or feature `hooks/`, server-only utilities in `web/src/server/`, and shared utilities in `web/src/lib/utils/`.
- Routes live in `web/src/routes/` using TanStack Router file conventions: `__root.tsx`, `index.tsx`, `<segment>.tsx`, `$param.tsx` for dynamic segments, `$.ts` for catch-alls. API routes live next to page routes (e.g. `web/src/routes/api/proxy/$.ts`) and use `createFileRoute` with `server.handlers` (`GET`, `POST`, etc.).
- Loaders prefetch into the per-request `QueryClient` via `context.queryClient.ensureQueryData(...)`. The router rehydrates the cache on the client; do not wrap routes with `<HydrationBoundary>`.
- Use the typed `Link`, `useNavigate`, `useLocation`, and `useSearch` from `@tanstack/react-router`. Do not import from `next/*` (next has been removed).
- Protected routes must enforce auth in both places: TanStack Router
  `beforeLoad` for SSR redirect behavior and `ProtectedRoute` for the
  client bootstrap race / unavailable-backend fallback. See
  `.docs/architecture/client-rehydration.md`.
- Avoid single-file folders and keep file-local helper functions at the end of the file.
- Keep `pnpm run lint` and `pnpm run build` reproducible without hidden network assumptions.

Commenting and naming:

- Prefer self-explanatory code over comments.
- Obvious comments such as "fetch data" or "set state" are noise; remove them.
- Comments are reserved for non-obvious reasoning, workarounds, security constraints, or performance tradeoffs.

Component organization:

- Components should do one thing well. If a file handles data fetching, mutation logic, pagination, and presentation, it is already too large.
- Extract duplicated logic immediately. Use `web/src/lib/utils/` for pure helpers, `web/src/components/common/` for shared UI, and hooks for reusable stateful behavior.
- Composition beats prop drilling and giant switch-heavy components.

Frontend review checklist:

- No component over 200 lines without a strong reason.
- No repeated logic in more than one place.
- No raw browser exposure of server-only env vars.
- Semantic HTML, keyboard support, and focus handling are preserved.
- Existing id-first content routing stays intact.

Navigation rule:

- The app is id-first for content detail routes. Use `buildContentUrlById()` and `navigateToContentById()` when you already have a Denn content id.
- Only resolve external ids through `contentItemActions.getOrCreate()` before navigating.

Security rule:

- The browser must never receive `PROXY_API_KEY`. Only TanStack Start server functions, route loaders running on the server, and the BFF API routes under `web/src/routes/api/` may attach it to outbound requests.

## Core Rules

- Use the modular settings layout in `core/core/settings/`; do not scatter runtime configuration across ad hoc modules.
- `core` owns authentication, lists, ratings, invitations, and normalized content persistence. Keep views thin and push orchestration into serializers, service modules, and utility layers where appropriate.
- If you need a new external metadata integration, add it in `proxy` first, then call it from `core/content/services/`. Do not add direct third-party API clients to `core`.
- Treat provider payloads as integration inputs, not as the target shape
  of the persisted domain model. Avoid mirroring provider-specific
  semantics such as external `status` fields into `core` unless a
  documented transitional reason exists.
- Preserve permission checks around shared lists, rating ownership, and membership rules. Do not bypass them in views or serializers for convenience.
- Keep API documentation annotations current when changing API shape; `drf-spectacular` is part of the contract surface.
- Django tests live under `core/*/tests/` and follow `test_*.py`.

## Proxy Rules

- Preserve the handler -> service -> provider/client layering wired in `proxy/cmd/api/main.go`.
- Provider-specific payloads and quirks belong in provider and mapper code. Handlers should return Denn-shaped responses, not raw upstream schemas.
- Keep default tests offline-safe. Live provider checks or integration-tagged tests must remain opt-in.
- Redis/cache failures should degrade gracefully rather than crash the service or force open-proxy behavior.
- Protected routes must continue to enforce API key auth and propagate `X-Request-Id`.
- `proxy` must not grow database state, user concepts, or session handling.
- Go tests should stay next to the code they cover as `*_test.go`.

## Docs and Change Hygiene

- `.docs/README.md` is the canonical index for project memory; keep it current when documentation is added, moved, or retired.
- Cross-service changes must update `.docs/` when they affect contracts, workflows, topology, observability, or operating commands.
- Architecture changes belong in ADRs under `.docs/adr/`.
- CI or validation workflow changes must stay aligned with `.docs/workspace-operating-model.md`.
- `architecture/` documents merged behavior, `roadmap/open-plans.md` summarizes active work, and `history/implementation-history.md` stores extracted outcomes from completed sprints.
- The dated product-analysis docs under `.docs/roadmap/` are secondary
  strategy references. When they disagree with current route structure
  or technical implementation, prefer `architecture/current-state.md`,
  active sprint docs, and this file.
- `.docs/sprints/` is only for open or future plans. When a sprint is finished, extract the durable outcomes into the canonical docs and remove the stale done plan.
- If you delete or rename developer-facing files, update any README references in the same change.
- Keep service directories free of duplicated agent/editor scaffolding; repository-wide guidance belongs at the root.
- GitHub workflows and repository automation belong in the root `.github/`, not inside individual services.
- Avoid parallel policy documents. If a rule matters repo-wide, keep it here instead of inventing another local guideline file.

## Pull Request Expectations

- Keep changes scoped to one service or one cross-service concern when possible.
- Report the exact validation commands you ran.
- Include screenshots for UI-visible changes.
- Call out contract changes explicitly when they affect more than one service.

## Performance Checklist

For any PR that touches a request path or its dependencies, include a
performance check in the PR description. Mark non-applicable items as
`N/A`; do not leave them implicit.

Backend (`core`):

- Avoid N+1 ORM queries. Use `select_related` / `prefetch_related` and add or update `assertNumQueries` tests when the budget changes.
- Avoid N+1 proxy calls. Use bulk proxy endpoints or source-data prepopulation patterns instead of per-item fetches.
- With `PERF_LOGGING_ENABLED=true`, inspect the `http_request` log and keep list endpoints at `query_count <= 10` unless justified.
- Keep `proxy_calls <= 2` and `proxy_time_ms <= 500` p95 for a single request unless there is a documented reason.
- Respect latency thresholds from `.docs/perf/baseline.md`.
- Do not lower `PROXY_GET_TIMEOUT`, `PROXY_BULK_TIMEOUT`, or `TMDB_SEASONS_MAX_WORKERS` without justification.

Frontend (`web`):

- Run a production build and validate LCP, INP, and CLS for touched flows against `.docs/perf/baseline.md`.
- New loading states should be dimensionally stable; routes that need one should set `pendingComponent` on the route definition.
- New server reads should follow the repo's TanStack Query patterns instead of `useEffect` + ad hoc `fetch`.
- New mutations should be optimistic and reversible, with proper rollback on failure.
- Mutations that change server state must live under `web/src/lib/api/mutations/` and invalidate or patch the affected `queryKeys`.
- Routes that know their initial server data should prefetch into the per-request `QueryClient` from the route loader via `context.queryClient.ensureQueryData(...)`. The router rehydrates the cache automatically; do not wrap with `<HydrationBoundary>`.
- Prefer the typed `<Link to=... params={...} search={...}>` and `useNavigate({ to, ... })` API over hand-built URL strings.
- Use hover prefetch (`preload="intent"`, the router default) on cards that lead to detail pages when it materially improves UX.

Documentation:

- Update `.docs/perf/baseline.md` when a new endpoint or flow is added, when a key measurement changes materially, or when a threshold changes.
- Add a `Performance impact` section to the PR description if any checklist item is unchecked or marked `N/A`.

Quick measurement hints:

- Backend p50/p95: `hey -n 50 -c 5 ...` or `ab -n 100 -c 5 ...`
- Backend per-request metrics: tail `core` logs with `PERF_LOGGING_ENABLED=true`
- Frontend vitals: use a production build and inspect browser console output or Lighthouse
