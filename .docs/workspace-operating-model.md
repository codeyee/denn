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
  - `make validate-web` (presupuesto de imágenes de autenticación + ESLint +
    `vite build`; artefacto Nitro en `web/.output/`)
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
- Every worktree is one Compose project, named `denn-<instance>`, with its
  own network, PostgreSQL volume, Redis state, dependency volumes and
  published port block. Fixed `container_name` values and the external
  shared `denn-pg-data` volume are intentionally not used.
- All published ports bind to `127.0.0.1`; service-to-service traffic
  stays on the instance's Compose network and continues to use service
  names such as `postgres`, `redis`, `proxy` and `core`.
- The worktree-local `.workspace/compose.env` records the instance id,
  project name, credentials and allocated ports. It is ignored and mode
  `0600`; allocation metadata is kept outside Git.
- `web`, `core` and `proxy` source trees are bind-mounted. Vite and Django
  reload automatically; `make restart-proxy` restarts Go.
- Root commands remain the stable human/agent contract. `make up` derives
  an instance from the current worktree, while the explicit aliases make
  parallel work obvious:
  - `make local-up INSTANCE=<id> WEB_PORT=<port>`
  - `make local-down INSTANCE=<id>` / `make local-destroy INSTANCE=<id>`
  - `make local-status INSTANCE=<id>` / `make local-logs INSTANCE=<id>`
  - `make local-smoke INSTANCE=<id>` / `make local-browser INSTANCE=<id>`
  - `make restart-web` / `make restart-core` / `make restart-proxy`
- A validated local PostgreSQL dump can be restored into one instance with
  `make local-clone INSTANCE=<id> FILE=<dump>`. This copies data into that
  instance; it never shares a database volume with another worktree.
- Local env files remain outside Git. `make env-store` keeps one private
  copy outside the repository and `make env-link` links new worktrees to
  it. Compose injects per-instance internal URLs and loopback origins.
- `make local-browser` uses the real selected local stack and may exercise
  provider APIs. `make e2e-web` remains deterministic, non-personal,
  offline-safe fixture coverage for CI.
- This model is local-only. Production workflows publish service images
  and do not consume `compose.local.yml`, worktree state or local volumes.
- Agents should call the root commands directly. A Denn-specific MCP
  wrapper is intentionally absent because it would duplicate this
  contract and widen secret handling without adding capability.

The complete procedure is
[`runbooks/local-development.md`](./runbooks/local-development.md).
