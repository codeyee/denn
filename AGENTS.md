# Repository Guidelines

This file is the single canonical guide for agents and contributors working in this monorepo. Do not recreate per-service `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or hidden agent/editor metadata directories under `web/`, `core/`, or `proxy/`.

## Monorepo Topology

- `web/`: Next.js 16 App Router frontend plus the browser-facing BFF for metadata calls.
- `core/`: Django + DRF API for accounts, lists, ratings, invitations, and normalized content persistence.
- `proxy/`: Go + Gin metadata service; the only service that talks to TMDB, IGDB, Spotify, and OpenLibrary directly.
- `.docs/`: ADRs, internal HTTP contracts, runbooks, performance notes, and workspace policy.
- Root `Makefile` and `.scripts/`: full-stack development and validation entrypoints.

### Integration Boundaries

- Browser -> `web` BFF -> `proxy` for public metadata.
- Browser -> `core` for authenticated, user-owned data.
- `core` -> `proxy` for server-side enrichment and canonical metadata fetches.

Do not bypass these paths casually. If a change alters service ownership, request flow, or credentials handling, update the relevant ADR and shared docs in `.docs/`.

## Read Before Changing Architecture

Start with:

- `README.md`
- `.docs/adr/0001-external-metadata-integration.md`
- `.docs/contracts/internal-http.md`
- `.docs/workspace-operating-model.md`
- `AGENTS.md`

## Root Commands

Use root `make` targets unless you are debugging a service in isolation.

- `make check`: verify local prerequisites.
- `make up` / `make down`: start or stop the full stack (`web`, `core`, `proxy`, Redis).
- `make status` / `make logs` / `make doctor`: inspect the local workspace.
- `make test`: run the default backend suite (`proxy` + `core`).
- `make validate-web`: run frontend lint + production build.
- `make validate-core`: run Django tests.
- `make validate-proxy`: run Go tests.
- `make build-proxy`: verify the Go service builds cleanly.

Notes:

- `make validate-web` wraps the minimum CI gate for `web`. `next build --webpack` is intentional; do not switch it back to Turbopack without validating CI and sandbox behavior.
- `make validate-core` depends on a working test database and valid env configuration.
- `make validate-proxy` must stay deterministic and offline-safe by default.

## Cross-Service Invariants

- `proxy` is the sole owner of upstream provider credentials.
- `PROXY_API_KEY` is server-only. Never expose it with a `NEXT_PUBLIC_` prefix.
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
- Prefer named exports. The exception is Next.js framework files such as `page.tsx`, `layout.tsx`, and `route.ts`.
- Treat ~150 lines as a refactor warning and 200 lines as a hard limit for React components. Split orchestration, hooks, and UI before adding more logic.
- Put shared UI in `web/app/_components/common/`, page-specific UI in `web/app/_components/pages/<Feature>/components/`, reusable hooks in `web/app/_hooks/` or feature `hooks/`, and utilities in `web/lib/utils/`.
- Avoid single-file folders and keep file-local helper functions at the end of the file.
- Keep `npm run lint` and `npm run build` reproducible without hidden network assumptions.

Commenting and naming:

- Prefer self-explanatory code over comments.
- Obvious comments such as "fetch data" or "set state" are noise; remove them.
- Comments are reserved for non-obvious reasoning, workarounds, security constraints, or performance tradeoffs.

Component organization:

- Components should do one thing well. If a file handles data fetching, mutation logic, pagination, and presentation, it is already too large.
- Extract duplicated logic immediately. Use `web/lib/utils/` for pure helpers, `web/app/_components/common/` for shared UI, and hooks for reusable stateful behavior.
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

- The browser must never receive `PROXY_API_KEY`. Only SSR code and the Next.js BFF may attach it to outbound requests.

## Core Rules

- Use the modular settings layout in `core/core/settings/`; do not scatter runtime configuration across ad hoc modules.
- `core` owns authentication, lists, ratings, invitations, and normalized content persistence. Keep views thin and push orchestration into serializers, service modules, and utility layers where appropriate.
- If you need a new external metadata integration, add it in `proxy` first, then call it from `core/content/services/`. Do not add direct third-party API clients to `core`.
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

- Cross-service changes must update `.docs/` when they affect contracts, workflows, topology, observability, or operating commands.
- Architecture changes belong in ADRs under `.docs/adr/`.
- CI or validation workflow changes must stay aligned with `.docs/workspace-operating-model.md`.
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
- New loading states should be dimensionally stable; add `loading.tsx` where a route needs one.
- New server reads should follow the repo's TanStack Query patterns instead of `useEffect` + ad hoc `fetch`.
- New mutations should be optimistic and reversible, with proper rollback on failure.
- Use hover prefetch on cards that lead to detail pages when it materially improves UX.
- Do not disable Next.js link prefetch without a written reason.

Documentation:

- Update `.docs/perf/baseline.md` when a new endpoint or flow is added, when a key measurement changes materially, or when a threshold changes.
- Add a `Performance impact` section to the PR description if any checklist item is unchecked or marked `N/A`.

Quick measurement hints:

- Backend p50/p95: `hey -n 50 -c 5 ...` or `ab -n 100 -c 5 ...`
- Backend per-request metrics: tail `core` logs with `PERF_LOGGING_ENABLED=true`
- Frontend vitals: use a production build and inspect browser console output or Lighthouse
