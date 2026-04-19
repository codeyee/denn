.PHONY: help up down restart status doctor logs check kill-orphans \
        tail-proxy tail-core tail-web tail-redis \
        test test-proxy test-core test-web \
        build-proxy \
        db-backup db-backups db-restore db-shell

SCRIPT := ./scripts/workspace-dev.sh

help:
	@echo "Local dev (full stack):"
	@echo "  make up               start proxy + core + web + redis"
	@echo "  make down             stop everything (including orphans)"
	@echo "  make restart          down + up"
	@echo "  make status           compact status table"
	@echo "  make doctor           full diagnostic (ports, env, redis, migrations, logs)"
	@echo "  make check            verify prerequisites are installed"
	@echo "  make kill-orphans     kill stray processes on dev ports"
	@echo
	@echo "Logs:"
	@echo "  make logs             combined tail of last 20 lines per service"
	@echo "  make tail-proxy       follow proxy log (color-stripped)"
	@echo "  make tail-core        follow core log"
	@echo "  make tail-web         follow web log"
	@echo "  make tail-redis       follow redis container logs"
	@echo
	@echo "Tests:"
	@echo "  make test             run full test suite (proxy + core)"
	@echo "  make test-proxy       go test ./..."
	@echo "  make test-core        django tests"
	@echo "  make test-web         vitest / next test if configured"
	@echo
	@echo "Database (local Postgres in docker):"
	@echo "  make db-backup        dump local DB to backups/<ts>.sql.gz (custom format + gzip)"
	@echo "  make db-backups       list existing backups (newest first)"
	@echo "  make db-restore FILE=backups/foo.sql.gz   restore a backup (drops + recreates DB)"
	@echo "  make db-shell         open psql against the local DB"

up:            ; @$(SCRIPT) up
down:          ; @$(SCRIPT) down
restart:       ; @$(SCRIPT) restart
status:        ; @$(SCRIPT) status
doctor:        ; @$(SCRIPT) doctor
logs:          ; @$(SCRIPT) logs
check:         ; @$(SCRIPT) check
kill-orphans:  ; @$(SCRIPT) kill-orphans

tail-proxy:    ; @$(SCRIPT) logs proxy
tail-core:     ; @$(SCRIPT) logs core
tail-web:      ; @$(SCRIPT) logs web
tail-redis:    ; @$(SCRIPT) logs redis

test: test-proxy test-core

test-proxy:
	cd proxy && go test ./...

test-core:
	cd core && .venv/bin/python manage.py test

test-web:
	cd web && npm test --silent || echo "(no test script configured)"

build-proxy:
	cd proxy && go build -o /tmp/denn-proxy-build ./cmd/api && rm -f /tmp/denn-proxy-build

# ── database ────────────────────────────────────────────────────────────────
# Override container/db with: PG_CONTAINER=foo PG_USER=bar PG_DB=baz make db-backup

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
