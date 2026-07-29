.PHONY: help setup-local up down restart status doctor logs check smoke-local browser-local \
        local-up local-down local-restart local-status local-doctor local-logs local-smoke local-browser local-destroy local-clone \
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
	@echo "  make setup-local      validate envs, prepare this worktree's images"
	@echo "  make up               start this worktree's isolated stack"
	@echo "  make down             stop this worktree and preserve its database"
	@echo "  make local-up INSTANCE=feature-a WEB_PORT=3000"
	@echo "  make local-status INSTANCE=feature-a"
	@echo "  make local-destroy INSTANCE=feature-a  (removes only its volumes)"
	@echo "  make restart          down + up"
	@echo "  make status           compact status table"
	@echo "  make doctor           validate envs, services, ports, migrations, and data"
	@echo "  make check            verify Docker and local-only env guardrails"
	@echo "  make smoke-local      HTTP, authenticated proxy and migration smoke"
	@echo "  make browser-local    Playwright smoke against this worktree"
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
	@echo "  make db-backup        dump this instance DB to backups/<instance>-db-<ts>.sql.gz"
	@echo "  make db-backups       list existing backups (newest first)"
	@echo "  make db-restore FILE=backups/foo.sql.gz   restore a backup (drops + recreates DB)"
	@echo "  make local-clone INSTANCE=<id> FILE=backups/foo.sql.gz"
	@echo "  make db-shell         open psql against the local DB"

setup-local:   ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) setup-local
up:            ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) up
down:          ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) down
restart:       ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) restart
status:        ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) status
doctor:        ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) doctor
logs:          ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) logs "$(SERVICE)"
check:         ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) check
smoke-local:   ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" REQUIRE_LOCAL_SNAPSHOT="$(REQUIRE_LOCAL_SNAPSHOT)" $(SCRIPT) smoke-local
browser-local: ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" REQUIRE_LOCAL_SNAPSHOT="$(REQUIRE_LOCAL_SNAPSHOT)" $(SCRIPT) browser-local

local-up:      ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) up
local-down:    ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) down
local-restart: ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) restart
local-status:  ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) status
local-doctor:  ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) doctor
local-logs:    ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) logs "$(SERVICE)"
local-smoke:   ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" REQUIRE_LOCAL_SNAPSHOT="$(REQUIRE_LOCAL_SNAPSHOT)" $(SCRIPT) smoke-local
local-browser: ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" REQUIRE_LOCAL_SNAPSHOT="$(REQUIRE_LOCAL_SNAPSHOT)" $(SCRIPT) browser-local
local-destroy: ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) destroy

restart-proxy: ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) restart-service proxy
restart-core:  ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) restart-service core
restart-web:   ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) restart-service web

env-store:     ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) env-store
env-link:      ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) env-link

tail-proxy:    ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) logs proxy
tail-core:     ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) logs core
tail-web:      ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) logs web
tail-redis:    ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) logs redis
tail-postgres: ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) logs postgres

test: test-proxy test-core

validate-web: check-auth-cards lint-web build-web
validate-core: test-core
validate-proxy: test-proxy

check-auth-cards:
	cd web && node scripts/optimize-auth-cards.mjs --check

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
# Override the ignored backup directory with: BACKUP_DIR=/safe/path make db-backup

db-backup:   ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) db-backup
db-backups:  ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) db-backups
db-shell:    ; @INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) db-shell

db-restore:
	@if [ -z "$(FILE)" ]; then \
	  echo "usage: make db-restore FILE=backups/denn-<instance>-db-<timestamp>.sql.gz"; \
	  echo; echo "available backups:"; \
	  INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) db-backups; \
	  exit 1; \
	fi
	@INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) db-restore "$(FILE)"

local-clone:
	@if [ -z "$(FILE)" ]; then \
	  echo "usage: make local-clone INSTANCE=<id> FILE=backups/<dump>.sql.gz"; \
	  exit 1; \
	fi
	@INSTANCE="$(INSTANCE)" WEB_PORT="$(WEB_PORT)" $(SCRIPT) local-clone "$(FILE)"
