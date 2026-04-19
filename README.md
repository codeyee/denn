# Denn

Denn is a multi-media tracker (movies, TV, games, music, books) built
as three cooperating services in a single monorepo:

| Path    | Stack                       | Role                                                           |
| ------- | --------------------------- | -------------------------------------------------------------- |
| `web/`  | Next.js (App Router) + TS   | UI, SSR, and a small BFF for browser → metadata calls          |
| `core/` | Django + DRF                | User accounts, lists, ratings, and other user-generated data   |
| `proxy/`| Go + Gin                    | Single owner of external metadata APIs (TMDB, IGDB, Spotify, OL) |

The integration topology is intentionally hybrid:

- **Browser → Next.js BFF → `proxy`** for public metadata (search,
  detail pages, etc.). The BFF lives in `web/app/api/proxy/[...path]`.
- **Browser → `core`** for anything tied to a Denn account (auth,
  lists, ratings).
- **`core` → `proxy`** for server-side enrichment when persisting a
  card needs canonical metadata.

The decision and its alternatives are recorded in
[`docs/adr/0001-external-metadata-integration.md`](./docs/adr/0001-external-metadata-integration.md).

---

## Where to read next

- [`docs/adr/`](./docs/adr/) - Architectural Decision Records.
  - `0001-external-metadata-integration.md` - the topology above.
  - `0002-web-auth-cookies.md` - migration plan for moving web session
    storage from `localStorage` to `HttpOnly` cookies.
- [`docs/contracts/internal-http.md`](./docs/contracts/internal-http.md) -
  Canonical HTTP contract between services: required headers, error
  envelope, pagination, request id, env vars.
- [`docs/observability.md`](./docs/observability.md) - Log schema,
  `X-Request-Id` correlation flow, and recommended alerts (signals
  are derived from access logs; there is no metrics endpoint yet —
  the doc explains why).
- [`docs/sprints/`](./docs/sprints/) - Sprint plans. Files prefixed
  with `done-` are completed.
- [`docs/workspace-operating-model.md`](./docs/workspace-operating-model.md) -
  How the three services are versioned, validated, and shipped from the
  monorepo.

Per-service docs:

- [`web/README.md`](./web/README.md)
- [`core/README.md`](./core/README.md)
- [`proxy/README.md`](./proxy/README.md)

---

## Local development

Each service has its own setup section in its README. The short
version:

```bash
# core (Django, port 8000)
cd core && python3 -m venv .venv && source .venv/bin/activate \
    && pip install -r requirements.txt \
    && cp .env.example .env \
    && ./.venv/bin/python manage.py migrate \
    && ./.venv/bin/python manage.py runserver

# proxy (Go, port 8081)
cd proxy && cp .env.example .env && make run

# web (Next.js, port 3000)
cd web && cp .env.example .env.local && npm install && npm run dev
```

The three services are connected through a small set of environment
variables; the canonical list is in
[`docs/contracts/internal-http.md`](./docs/contracts/internal-http.md).
The most important rule: `PROXY_API_KEY` is **server-only**. It must
never be set with the `NEXT_PUBLIC_` prefix.

## CI and deploy

The repo validates changes from the root and deploys each app
independently:

- Pull requests run the root workflow
  [`.github/workflows/monorepo-ci.yml`](./.github/workflows/monorepo-ci.yml),
  which only validates the areas touched by the PR and ends in a
  single `ci-summary` check for branch protection.
- Pushes to `main` trigger app-specific deploy workflows by path:
  - [`deploy-web.yml`](./.github/workflows/deploy-web.yml)
  - [`deploy-core.yml`](./.github/workflows/deploy-core.yml)
  - [`deploy-proxy.yml`](./.github/workflows/deploy-proxy.yml)
- Each deploy builds from its own directory, publishes its own image,
  and calls its own deploy webhook.

---

## Tests

```bash
cd proxy && go test ./...
cd core  && ./.venv/bin/python manage.py test
cd web   && npm test  # when the web test suite is wired up
```

Contract tests for the cross-service error envelope live in:

- `proxy/internal/handlers/common/response_test.go`
- `core/core/tests/test_error_envelope.py`

Both lock down the same shape, so consumer code can rely on it
unchanged across services.
