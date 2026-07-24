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

- Use the root commands when working on the full stack together:
  - `make check`
  - `make up`
  - `make status`
  - `make logs`
  - `make down`
- The root launcher starts:
  - a temporary Redis container with no persistent volume
  - `proxy` with `go run ./cmd/api`
  - `core` with `./.venv/bin/python manage.py runserver`
  - `web` with `pnpm run dev`
- `core` and `proxy` receive `REDIS_URL` from the root launcher, so local cache lives only while the stack is up.
