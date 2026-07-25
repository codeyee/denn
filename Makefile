.PHONY: help setup-local up down restart status doctor logs check smoke-local browser-local \
        restart-proxy restart-core restart-web \
        env-store env-link \
        tail-proxy tail-core tail-web tail-redis tail-postgres \
        test test-proxy test-core test-web \
        e2e-web e2e-web-regressions e2e-web-performance e2e-web-artifact-check \
        validate-web validate-core validate-proxy \
        lint-web build-web \
        build-proxy \
        db-backup db-backups db-restore db-shell

SCRIPT := ./.scripts/workspace.sh

help:
	@echo "Local dev (Docker Compose, full stack):"
	@echo "  make setup-local      validate envs, prepare volume, pull/build images"
	@echo "  make up               start postgres + redis + proxy + core + web"
	@echo "  make down             stop the stack and preserve the database volume"
	@echo "  make restart          down + up"
	@echo "  make status           compact status table"
	@echo "  make doctor           validate envs, services, ports, migrations, and data"
	@echo "  make check            verify Docker and local-only env guardrails"
	@echo "  make smoke-local      HTTP, authenticated proxy, migration, and DB smoke"
	@echo "  make browser-local    Playwright smoke against the real local stack"
	@echo "  make restart-web      restart only the Vite service"
	@echo "  make restart-core     restart only Django"
	@echo "  make restart-proxy    restart Go after source changes"
	@echo
	@echo "Private env reuse across worktrees:"
	@echo "  make env-store        store current envs outside Git (default ~/.config/denn/local)"
	@echo "  make env-link         link this worktree to the private env store"
	@echo
	@echo "Logs:"
	@echo "  make logs             last 30 lines for the full stack"
	@echo "  make tail-proxy       follow proxy logs"
	@echo "  make tail-core        follow core log"
	@echo "  make tail-web         follow web log"
	@echo "  make tail-redis       follow Redis logs"
	@echo "  make tail-postgres    follow PostgreSQL logs"
	@echo
	@echo "Tests:"
	@echo "  make test             run full test suite (proxy + core)"
	@echo "  make validate-web     run frontend lint + build"
	@echo "  make validate-core    run django tests"
	@echo "  make validate-proxy   run go tests"
	@echo "  make test-proxy       go test ./..."
	@echo "  make test-core        django tests"
	@echo "  make test-web         vitest run if configured"
	@echo "  make e2e-web          production-build Playwright smoke (desktop + mobile)"
	@echo "  make e2e-web-regressions  expected-failure audit reproductions"
	@echo "  make e2e-web-performance repeatable cold/warm browser baseline"
	@echo "  make e2e-web-artifact-check verify retained/redacted failure artifacts (expected non-zero)"
	@echo "  make lint-web         run frontend lint"
	@echo "  make build-web        run frontend production build"
	@echo
	@echo "Database (local Postgres in docker):"
	@echo "  make db-backup        dump local DB to backups/<ts>.sql.gz (custom format + gzip)"
	@echo "  make db-backups       list existing backups (newest first)"
	@echo "  make db-restore FILE=backups/foo.sql.gz   restore a backup (drops + recreates DB)"
	@echo "  make db-shell         open psql against the local DB"

setup-local:   ; @$(SCRIPT) setup-local
up:            ; @$(SCRIPT) up
down:          ; @$(SCRIPT) down
restart:       ; @$(SCRIPT) restart
status:        ; @$(SCRIPT) status
doctor:        ; @$(SCRIPT) doctor
logs:          ; @$(SCRIPT) logs
check:         ; @$(SCRIPT) check
smoke-local:   ; @$(SCRIPT) smoke-local
browser-local: ; @$(SCRIPT) browser-local

restart-proxy: ; @$(SCRIPT) restart-service proxy
restart-core:  ; @$(SCRIPT) restart-service core
restart-web:   ; @$(SCRIPT) restart-service web

env-store:     ; @$(SCRIPT) env-store
env-link:      ; @$(SCRIPT) env-link

tail-proxy:    ; @$(SCRIPT) logs proxy
tail-core:     ; @$(SCRIPT) logs core
tail-web:      ; @$(SCRIPT) logs web
tail-redis:    ; @$(SCRIPT) logs redis
tail-postgres: ; @$(SCRIPT) logs postgres

test: test-proxy test-core

validate-web: lint-web build-web
validate-core: test-core
validate-proxy: test-proxy

lint-web:
	cd web && node node_modules/eslint/bin/eslint.js .

build-web:
	cd web && node node_modules/vite/bin/vite.js build

test-proxy:
	cd proxy && go test ./...

test-core:
	cd core && AUTH_COOKIE_SECURE=True .venv/bin/python manage.py test

test-web:
	cd web && node node_modules/vitest/vitest.mjs run

e2e-web:
	cd web && pnpm run test:e2e

e2e-web-regressions:
	cd web && pnpm run test:e2e:regressions

e2e-web-performance:
	cd web && pnpm run test:e2e:performance

e2e-web-artifact-check:
	cd web && pnpm run test:e2e:artifact-check

build-proxy:
	cd proxy && go build -o /tmp/denn-proxy-build ./cmd/api && rm -f /tmp/denn-proxy-build

# ── database ────────────────────────────────────────────────────────────────
# Override local paths with: PG_CONTAINER=foo BACKUP_DIR=/safe/path make db-backup

db-backup:   ; @$(SCRIPT) db-backup
db-backups:  ; @$(SCRIPT) db-backups
db-shell:    ; @$(SCRIPT) db-shell

db-restore:
	@if [ -z "$(FILE)" ]; then \
	  echo "usage: make db-restore FILE=backups/denn-db-<timestamp>.sql.gz"; \
	  echo; echo "available backups:"; \
	  $(SCRIPT) db-backups; \
	  exit 1; \
	fi
	@$(SCRIPT) db-restore "$(FILE)"
