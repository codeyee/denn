# Runbook — Local Full-Stack Development

Use this runbook to develop or validate Denn without deploying. It is
the canonical workflow for humans and agents working across `web`,
`core`, and `proxy`.

The local stack is isolated from production and from every other
worktree. One worktree maps to one Compose project named
`denn-<instance>`:

| Service | Local address | Runtime state |
| --- | --- | --- |
| `web` | `http://127.0.0.1:<WEB_PORT>` | bind-mounted source, Vite reload |
| `core` | `http://127.0.0.1:<CORE_PORT>/api/` | bind-mounted source, Django reload |
| `proxy` | `http://127.0.0.1:<PROXY_PORT>/v1/proxy/` | bind-mounted source, explicit restart |
| PostgreSQL 18 | `127.0.0.1:<POSTGRES_PORT>` | instance-scoped persistent volume |
| Redis | `127.0.0.1:<REDIS_PORT>` | instance-scoped local cache |

All published ports use loopback. Internal URLs are overridden to
Compose service names so no local request path depends on a deployed
Denn service. `WEB_PORT` defaults to the first available port in
`3000-3099`; the other ports are derived as `WEB_PORT+5000` (Core),
`WEB_PORT+5080` (proxy), `WEB_PORT+2432` (PostgreSQL) and
`WEB_PORT+3390` (Redis).

## Prerequisites

- Docker with Compose v2 (Docker Desktop or OrbStack on macOS).
- `curl`, `gzip`, `gunzip`, and `lsof`.
- Private local-only env files at:
  - `web/.env`
  - `core/.env`
  - `proxy/.env`

Start from each service's `.env.example`. The local files must use
loopback URLs; their exact host ports are only used for direct host
commands because Compose injects per-instance service URLs:

- `web:API_URL=http://127.0.0.1:8000/api`;
- `web:PROXY_API_URL=http://127.0.0.1:8080/v1/proxy`;
- `core:DATABASE_URL` pointing to PostgreSQL on
  `localhost`/`127.0.0.1`;
- `core:PROXY_API_BASE_URL` pointing to a loopback proxy URL;
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

For parallel work, make the identity and primary port explicit:

Run each command from the corresponding Git worktree. The three examples
below represent three separate worktree terminals.

```bash
make local-up INSTANCE=feature-a WEB_PORT=3000
make local-up INSTANCE=feature-b WEB_PORT=3001
make local-up INSTANCE=feature-c WEB_PORT=3002
```

`make setup-local`:

- derives a stable instance id from the worktree, unless `INSTANCE` is
  provided;
- allocates or reuses a loopback port block and writes it to the ignored
  `.workspace/compose.env`;
- builds local images and creates project-scoped volumes;
- never adopts, removes or rewrites containers belonging to another
  Compose project.

It does not copy or connect to production. Restoring a snapshot is a
separate, explicit operation.

## Daily Development Loop

```bash
make up
make status
```

Or explicitly target one instance:

```bash
make local-status INSTANCE=feature-b
make local-logs INSTANCE=feature-b SERVICE=web
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
curl --fail http://127.0.0.1:<CORE_PORT>/api/
curl --fail http://127.0.0.1:<PROXY_PORT>/v1/proxy/health
curl --fail http://127.0.0.1:<WEB_PORT>/
```

Replace the placeholders with the URLs printed by `make up` or
`make local-status`.

Use `make smoke-local` for an authenticated proxy probe. It reads the
key privately and never prints it.

Run host-side Core tests against the selected instance by passing its
identity (or primary port):

```bash
make test-core INSTANCE=feature-b WEB_PORT=3001
make validate-core INSTANCE=feature-b
```

The instance-aware target exports a loopback `DATABASE_URL` using that
stack's PostgreSQL port before invoking Django. Without `INSTANCE` or
`WEB_PORT`, `make test-core` keeps the CI-friendly host test behavior.

Stop the stack with:

```bash
make down
```

This preserves the current instance's PostgreSQL volume. A subsequent
`make up` sees the same local users, content, lists, and ratings without
sharing them with another worktree. Use `make local-destroy` only when
the instance and its data can be discarded.

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

Create a validated custom-format gzip backup for the current instance:

```bash
make db-backup
make db-backups
```

Restore only into the selected local instance:

```bash
make db-restore FILE=backups/denn-feature-a-db-<timestamp>.sql.gz
```

To copy a validated dump into a new parallel instance:

```bash
make local-up INSTANCE=feature-b WEB_PORT=3001
make local-clone INSTANCE=feature-b FILE=backups/denn-feature-a-db-<timestamp>.sql.gz
make local-smoke INSTANCE=feature-b REQUIRE_LOCAL_SNAPSHOT=true
```

Restore is intentionally destructive to the current local database: it
stops local `web` and `core`, drops and recreates the local database,
validates the archive, restores it, then restarts those services.
Production is never a restore target.

Backups are ignored by Git and should remain mode `0600`. Do not copy
personal rows into fixtures, logs, screenshots, issues, or PRs.

## Validation Modes

Use both modes for different evidence:

- `make smoke-local` checks the real selected local stack, proxy auth,
  migrations and loopback port bindings. It does not require restored
  content by default; add `REQUIRE_LOCAL_SNAPSHOT=true` when that evidence
  is required.
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
checks, browser validation, database cloning and service restarts. An
agent must keep the `INSTANCE` and printed URLs in its task context and
must not assume that port `3000` belongs to its worktree.

There is intentionally no Denn-specific MCP configuration in the
repository. An MCP wrapper around shell and Compose would duplicate the
same capabilities while adding another process that can see secrets.
Only introduce one in a future ADR if it adds a capability unavailable
through the root commands and can preserve the same local-only and
server-only credential boundaries.

## Troubleshooting

- `make check` fails: correct the named `.env` setting; do not disable
  the guard.
- A service is unhealthy: run `make local-logs INSTANCE=<id>` or the
  matching `tail-*` command from that worktree.
- Go source did not reload: run `make restart-proxy`.
- A dependency lockfile changed: rerun `make setup-local`; the web
  dependency volume belongs only to the current Compose project.
- Migrations are pending: restart core or run `make restart-core`; its
  startup applies committed migrations before serving.
- A browser test fails: inspect the trace/screenshot/video under
  `web/test-results/local-artifacts/`.
- A requested port block is occupied: stop that exact process or choose a
  different `WEB_PORT`, then rerun `make local-up`. Do not kill broad
  process groups.
- OrbStack shows two groups with the same old `denn-local` name: they are
  legacy containers from the previous fixed-name model. Do not delete them
  blindly; inspect mounts and stop that legacy project explicitly before
  reclaiming its ports or the old `denn-pg-data` volume.
