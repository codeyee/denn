# Runbook — Local Full-Stack Development

Use this runbook to develop or validate Denn without deploying. It is
the canonical workflow for humans and agents working across `web`,
`core`, and `proxy`.

The local stack is isolated from production:

| Service | Local address | Runtime state |
| --- | --- | --- |
| `web` | `http://127.0.0.1:3000` | bind-mounted source, Vite reload |
| `core` | `http://127.0.0.1:8000/api/` | bind-mounted source, Django reload |
| `proxy` | `http://127.0.0.1:8080/v1/proxy/` | bind-mounted source, explicit restart |
| PostgreSQL 18 | `127.0.0.1:5432` | persistent `denn-pg-data` volume |
| Redis | `127.0.0.1:6390` | local cache only |

All published ports use loopback. Internal URLs are overridden to
Compose service names so no local request path depends on a deployed
Denn service.

## Prerequisites

- Docker with Compose v2 (Docker Desktop or OrbStack on macOS).
- `curl`, `gzip`, and `gunzip`.
- Private local-only env files at:
  - `web/.env`
  - `core/.env`
  - `proxy/.env`

Start from each service's `.env.example`. The local files must use:

- `web:API_URL=http://127.0.0.1:8000/api`;
- `web:PROXY_API_URL=http://127.0.0.1:8080/v1/proxy`;
- `core:DATABASE_URL` pointing to PostgreSQL on
  `localhost`/`127.0.0.1:5432`;
- `core:PROXY_API_BASE_URL=http://127.0.0.1:8080/v1/proxy`;
- insecure cookies only for local HTTP;
- the same private proxy key in `web`, `core`, and `proxy`.

Provider credentials remain only in `proxy/.env`. Never copy one into a
public-prefixed web variable.

`make check` validates those conditions without printing values. It
fails closed if a deployed URL, production cookie setting, missing
provider credential, mismatched shared key, or public secret is found.

## First Setup

```bash
make check
make setup-local
make up
make smoke-local
```

`make setup-local`:

- prepares a private `.workspace/compose.env` derived from the local
  PostgreSQL URL;
- builds dependency-only development images;
- creates or reuses `denn-pg-data`;
- safely adopts the previous `denn-pg` container only when it uses that
  exact volume;
- removes only the obsolete non-persistent Denn Redis container.

It does not copy or connect to production. Restoring a snapshot is a
separate, explicit operation.

## Daily Development Loop

```bash
make up
make status
```

Edit source normally:

- `web` reloads through Vite;
- `core` reloads through Django's development server;
- after a `proxy` change, run `make restart-proxy`.

For targeted restarts:

```bash
make restart-web
make restart-core
make restart-proxy
```

Inspect the stack:

```bash
make logs
make tail-web
make tail-core
make tail-proxy
make doctor
```

Public endpoints may be probed directly:

```bash
curl --fail http://127.0.0.1:8000/api/
curl --fail http://127.0.0.1:8080/v1/proxy/health
curl --fail http://127.0.0.1:3000/
```

Use `make smoke-local` for an authenticated proxy probe. It reads the
key privately and never prints it.

Stop the stack with:

```bash
make down
```

This preserves `denn-pg-data`. A subsequent `make up` sees the same
local users, content, lists, and ratings.

## Reusing Envs Across Worktrees

Keep one private canonical copy outside every Git worktree:

```bash
make env-store
```

The default directory is `~/.config/denn/local`, mode `0700`; its files
use mode `0600`. Override the location with `DENN_LOCAL_ENV_DIR`.

In a new worktree:

```bash
make env-link
make check
make up
```

`env-link` refuses to overwrite an existing file. The links and store
remain untracked.

## Local Database Snapshots

Create a validated custom-format gzip backup:

```bash
make db-backup
make db-backups
```

Restore only into the local `denn-pg` container:

```bash
make db-restore FILE=backups/denn-production-<timestamp>.sql.gz
```

Restore is intentionally destructive to the current local database: it
stops local `web` and `core`, drops and recreates the local database,
validates the archive, restores it, then restarts those services.
Production is never a restore target.

Backups are ignored by Git and should remain mode `0600`. Do not copy
personal rows into fixtures, logs, screenshots, issues, or PRs.

## Validation Modes

Use both modes for different evidence:

- `make smoke-local` checks the real local stack, shared proxy auth,
  migrations, restored content, and loopback port bindings.
- The `web` container healthcheck targets `/api/health`, a no-store
  readiness response that does not render the homepage or call `core`
  and `proxy`.
- `make browser-local` runs Chromium against the real local stack and
  stores local-only artifacts under
  `web/test-results/local-artifacts/`. Its image is built from the web
  source with `.env` excluded; the browser container receives no
  service credentials.
- `make e2e-web` builds the production bundle against deterministic,
  non-personal fixtures. It remains the repeatable CI gate.

Do not relabel real-snapshot local evidence as deterministic CI,
staging, or production evidence.

## Agent And MCP Boundary

Agents use the same root Make targets as contributors. These commands
provide stable, scriptable operations for startup, health, logs, API
checks, browser validation, and service restarts.

There is intentionally no Denn-specific MCP configuration in the
repository. An MCP wrapper around shell and Compose would duplicate the
same capabilities while adding another process that can see secrets.
Only introduce one in a future ADR if it adds a capability unavailable
through the root commands and can preserve the same local-only and
server-only credential boundaries.

## Troubleshooting

- `make check` fails: correct the named `.env` setting; do not disable
  the guard.
- A service is unhealthy: run `make logs` or the matching `tail-*`
  command.
- Go source did not reload: run `make restart-proxy`.
- A dependency lockfile changed: rerun `make setup-local`; the web
  dependency volume is keyed by the lockfile checksum.
- Migrations are pending: restart core or run `make restart-core`; its
  startup applies committed migrations before serving.
- A browser test fails: inspect the trace/screenshot/video under
  `web/test-results/local-artifacts/`.
- A port is occupied by a non-Denn process: stop that exact process,
  then rerun `make up`. Do not kill broad process groups.
