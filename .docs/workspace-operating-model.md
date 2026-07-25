# Workspace Operating Model

`/home/perso/codeyee/denn` is the canonical monorepo for Denn.

- `web`
- `core`
- `proxy`

Each app keeps its own runtime, dependency graph, Dockerfile, and deploy
pipeline, but they now share one Git history, one PR surface, one root
CI entrypoint, and one source of truth for cross-service docs and
tooling.

## Shared Documentation Rules

- `.docs/README.md` is the canonical index and starting point for shared
  project memory.
- Cross-service documentation lives in `.docs/` at the repo root.
- App-specific implementation notes stay inside each app directory.
- Cross-app changes must update the shared docs when they affect
  operating commands, CI policy, compatibility expectations, or deploy
  behavior.

## Minimum Local Validation Commands

- `web`
  - `pnpm install --frozen-lockfile`
  - `make validate-web` (ESLint + `vite build`; artefacto Nitro en `web/.output/`)
  - `make e2e-web` (production-build Playwright smoke; desktop + móvil)
- `core`
  - `make validate-core`
- `proxy`
  - `make validate-proxy`

## CI Policy

- Pull requests validate from the root through
  `.github/workflows/monorepo-ci.yml`.
- That workflow detects changed paths and only runs the relevant app
  checks plus any workspace-level checks.
- Branch protection should require the final `ci-summary` job rather
  than app-specific jobs directly, because untouched apps are skipped.
- Changes under `web/**` also run the deterministic desktop Playwright
  smoke. Browser failure artifacts are retained for diagnosis.
- `.github/workflows/browser-baseline.yml` runs weekly and on demand for
  cold/warm measurements plus the promoted regression matrix; it is
  evidence, not a deploy gate.
- Pushes to `main` deploy by path:
  - `web/**` -> `.github/workflows/deploy-web.yml`
  - `core/**` -> `.github/workflows/deploy-core.yml`
  - `proxy/**` -> `.github/workflows/deploy-proxy.yml`
- Each deploy workflow validates its own app, builds from its own
  directory, publishes a dedicated GHCR image, and triggers a dedicated
  deploy webhook.
- The Core image runs `python manage.py migrate --noinput` before
  Gunicorn. Schema failure therefore fails container startup instead of
  letting application code serve against an older database shape.
- Cross-service auth cutovers preserve deploy order: when one push
  changes both `web` and `core`, the core workflow waits for the public
  web `/api/version` endpoint to report the matching `BUILD_SHA` before
  invoking the core webhook. Core-only pushes remain independent.

## Image Publishing

- `web` publishes `ghcr.io/codeyee/denn-web`
- `core` publishes `ghcr.io/codeyee/denn-core`
- `proxy` publishes `ghcr.io/codeyee/denn-proxy`

Tags are per app and include `latest` plus a short SHA tag.

## Local Development

- `compose.local.yml` is the canonical full-stack runtime for local
  development. It runs PostgreSQL 18, Redis, `proxy`, `core`, and `web`.
- All published ports bind to `127.0.0.1`; service-to-service traffic
  stays on the Compose network.
- PostgreSQL uses the external `denn-pg-data` volume. `make down`
  preserves it.
- `web`, `core`, and `proxy` source trees are bind-mounted. Vite and
  Django reload automatically; `make restart-proxy` restarts Go.
- Root commands are the stable human/agent contract:
  - `make check` / `make setup-local`
  - `make up` / `make down`
  - `make status` / `make logs` / `make doctor`
  - `make smoke-local` / `make browser-local`
  - `make restart-web` / `make restart-core` / `make restart-proxy`
- Local env files remain outside Git. `make env-store` keeps one private
  copy outside the repository and `make env-link` links new worktrees to
  it.
- `make browser-local` uses the real local stack and may exercise
  provider APIs. `make e2e-web` remains deterministic, non-personal,
  offline-safe fixture coverage for CI.
- Agents should call the root commands directly. A Denn-specific MCP
  wrapper is intentionally absent because it would duplicate this
  contract and widen secret handling without adding capability.

The complete procedure is
[`runbooks/local-development.md`](./runbooks/local-development.md).
