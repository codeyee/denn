# ADR 0006: Isolated local Compose stacks per worktree

- Status: accepted
- Date: 2026-07-29
- Scope: local development and validation only

## Context

Denn is a monorepo with `web`, `core` and `proxy`, plus PostgreSQL and
Redis for the local full-stack workflow. The previous local Compose file
used one fixed project name, fixed container names, fixed host ports and a
shared external PostgreSQL volume. That model caused parallel worktrees to
appear under the same OrbStack project and allowed source from one worktree
to run against state or services started from another.

Agents and developers need to run several branches at the same time, open
each frontend in a browser, and test each branch against its own backend and
database.

## Decision

One Git worktree maps to one local Compose project:

- project name: `denn-<instance>`;
- one private Compose network;
- one PostgreSQL container and project-scoped volume;
- one Redis container;
- one `proxy`, `core` and `web` container;
- one project-scoped dependency volume set;
- loopback-only host ports allocated from the worktree's `WEB_PORT`.

Compose service-to-service URLs remain stable (`postgres`, `redis`,
`proxy`, `core`, `web`). Host ports are an observation and browser access
concern, not an application configuration concern.

The default host-port block is derived from the web port:

| Service | Host port formula for `WEB_PORT=3000` |
| --- | ---: |
| web | 3000 |
| core | 8000 |
| proxy | 8080 |
| PostgreSQL | 5432 |
| Redis | 6390 |

The next instances use the same offsets, for example `3001/8001/8081` and
`3002/8002/8082`. The allocator checks the complete block and persists the
selection in ignored worktree state.

Fixed `container_name` values, a fixed top-level Compose `name`, and the
shared external `denn-pg-data` volume are not used by the new model.

## Data and snapshots

An instance starts with migrations and may then receive a validated custom
format PostgreSQL dump through `make local-clone`. Dumps are restored into
the selected instance's database; a database volume is never shared across
worktrees. The old `denn-pg-data` volume is not deleted automatically during
adoption of this model.

Smoke validation checks service health, proxy authentication, migrations
and loopback bindings. Restored content is an explicit additional gate via
`REQUIRE_LOCAL_SNAPSHOT=true`.

## Agent and developer contract

The stable commands are:

```bash
make local-up INSTANCE=<id> WEB_PORT=<port>
make local-status INSTANCE=<id>
make local-smoke INSTANCE=<id>
make local-browser INSTANCE=<id>
make local-down INSTANCE=<id>
make local-destroy INSTANCE=<id>
```

`local-destroy` removes only the selected Compose project's volumes and is
separate from `local-down`, which preserves them. Agents must use the URLs
printed for their instance and must not assume that port `3000` belongs to
the current worktree.

## Production boundary

This decision does not change production deployment. Production continues
to build and publish the service-specific images through the existing
workflows. It does not consume `compose.local.yml`, worktree state, local
environment files or local Docker volumes.

## Alternatives considered

### One shared database with per-worktree application containers

Rejected as the default. It saves resources but permits migrations, test
data and cache state to cross branch boundaries.

### Separate `denn-db` and `denn-services` Compose projects

Rejected. It adds cross-project networks, startup ordering and shared
database coupling while still failing to isolate parallel branches.

### One full stack with fixed names and ports

Rejected because Docker names and host ports collide as soon as two
worktrees run concurrently.
