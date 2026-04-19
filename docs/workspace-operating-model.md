# Workspace Operating Model

`/home/perso/codeyee/denn` is a container workspace with three independent Git repositories:

- `web`
- `core`
- `proxy`

It is not a monorepo. Each app keeps its own history, workflows, image publishing, and dependency graph.

## Shared Documentation Rules

- Cross-repo documentation lives in `docs/` at the workspace root.
- App-specific implementation notes stay inside each repo.
- Cross-app changes must update the shared docs when they affect operating commands, CI policy, or compatibility expectations.

## Minimum Local Validation Commands

- `web`
  - `npm ci`
  - `npm run lint`
  - `npm run build`
- `core`
  - `./.venv/bin/python manage.py test`
- `proxy`
  - `go test ./...`

## CI Policy

- Validation runs in each repo independently.
- Image publish jobs depend on validation success.
- No root-level workflow orchestrates all three repos.

## Local Development

- The root can provide convenience orchestration without becoming a monorepo.
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
  - `web` with `npm run dev`
- `core` and `proxy` receive `REDIS_URL` from the root launcher, so local cache lives only while the stack is up.
