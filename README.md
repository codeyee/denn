# Denn Core (API)

Django + Django REST Framework service that owns the user-generated
domain of Denn: accounts, lists, content cards, ratings. It is **not**
an API gateway and it does not proxy external metadata to the browser.

For the wider topology, including how this service collaborates with
`web` and `proxy`, read
[`docs/adr/0001-external-metadata-integration.md`](../docs/adr/0001-external-metadata-integration.md).
The cross-service HTTP contract is documented in
[`docs/contracts/internal-http.md`](../docs/contracts/internal-http.md).

---

## Responsibilities

`core` owns:

- User authentication (JWT) and account lifecycle.
- Lists, list items, ratings, and any other user-generated entities.
- **Persistence of normalized content detail (Sprint 07).** Per-type
  `*Detail` rows + child tables (`Episode`, `Track`, `Image`, …) live in
  PostgreSQL. The Go `proxy` stays stateless w.r.t. Postgres; `core` is
  the single source of truth for cached content.
- The local-first read path
  (`content/services/source_data_orchestrator.py`) that classifies items
  as `fresh_local`, `stale_local`, or `missing` and only calls `proxy`
  for the latter two.
- Periodic refresh of stale Detail rows via the
  `rehydrate_content_details` management command (see
  [`docs/runbooks/rehydrate-content.md`](../docs/runbooks/rehydrate-content.md)).
- Server-to-server enrichment calls to `proxy` when ingesting brand-new
  external IDs.
- Returning the canonical Denn error envelope on any 4xx/5xx, with a
  `request_id` for cross-service correlation.

`core` explicitly does NOT:

- Forward arbitrary external metadata requests from the browser. Those
  go through the Next.js BFF in `web` to `proxy` directly.
- Hold any external API keys other than the shared `PROXY_API_KEY`
  used to talk to `proxy`.

---

## Tech stack

- Python 3.10+
- Django + Django REST Framework
- PostgreSQL in production, SQLite for local development
- `requests` for outbound calls
- `python-dotenv` for local env loading
- `django-cors-headers` for browser CORS

---

## Getting started

```bash
cd core
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # then fill in real values
./.venv/bin/python manage.py migrate
./.venv/bin/python manage.py runserver
```

The API will be available at `http://localhost:8000`.

### Environment variables

The authoritative list lives in `core/.env.example`. The variables
that matter for this service:

- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` - Django basics.
- `PG*` - PostgreSQL connection (production).
- `CORS_ALLOWED_ORIGINS` - origins permitted to call this API.
- `PROXY_BASE_URL` - URL of the `proxy` service.
- `PROXY_API_KEY` - shared key used to authenticate against `proxy`.
  **Server-only**; never exposed to the browser. See
  `docs/contracts/internal-http.md` for the security rationale.

### Tests

```bash
./.venv/bin/python manage.py test
```

---

## Observability

This service emits one JSON log line per request and propagates
`X-Request-Id` end-to-end. See
[`docs/observability.md`](../docs/observability.md) for the log
schema, correlation flow, and the recommended minimal alerts.

Relevant code:

- `core/middleware/request_id.py` - generates / propagates the request
  id.
- `core/middleware/access_log.py` - structured access log.
- `core/logging.py` - JSON formatter shared by all loggers.
- `core/exceptions.py` - canonical error envelope (matches `proxy`).

---

## Adding a new outbound integration

When `core` needs metadata from a new external source, add it inside
`proxy` first, then call it from a service module under
`content/services/`. Do not introduce a new external client directly
in `core` - that would re-create the gateway role we are explicitly
moving away from.

---

## Deployment

The service is configured to deploy on Railway with PostgreSQL,
Gunicorn, and Whitenoise. See `RAILWAY_DEPLOYMENT_GUIDE.md` and
`ENV_VARIABLES.md` in this folder for the full procedure.
