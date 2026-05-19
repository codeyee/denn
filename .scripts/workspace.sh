#!/usr/bin/env bash
#
# Local dev orchestrator for the denn workspace.
#
# Goals (lessons learned the hard way):
#   * `up` / `restart` MUST guarantee that the listener on each port is the
#     process we just spawned, not a leftover from a previous session. We
#     validate the bind by polling the port and the health endpoint after
#     start; if it doesn't come up, we surface the relevant log tail and
#     fail loudly instead of pretending everything is fine.
#   * `down` / `stop` MUST remove orphans (anything still bound to our
#     ports), not only the PID we tracked.
#   * Logs are written without ANSI colors (NO_COLOR=1, GIN_MODE=release)
#     so `grep` and `tail` work reliably.
#   * `doctor` gives a one-shot health summary so the user can debug
#     "why isn't this working?" without spelunking.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.workspace"
LOG_DIR="$STATE_DIR/logs"
PID_DIR="$STATE_DIR/pids"
REDIS_CONTAINER_NAME="denn-workspace-redis"
REDIS_PORT="${REDIS_PORT:-6390}"
REDIS_URL="redis://127.0.0.1:${REDIS_PORT}/1"

PROXY_PORT="${PROXY_PORT:-8080}"
CORE_PORT="${CORE_PORT:-8000}"
WEB_PORT="${WEB_PORT:-3000}"

# Local Postgres (the dev DB lives in this docker container).
# Override with PG_CONTAINER if your container name differs.
PG_CONTAINER="${PG_CONTAINER:-denn-pg}"
PG_USER="${PG_USER:-denn}"
PG_DB="${PG_DB:-denn}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"

# Health probe per service. Path is appended to http://localhost:PORT.
PROXY_HEALTH_PATH="/v1/proxy/health"
CORE_HEALTH_PATH="/api/"
WEB_HEALTH_PATH="/"

START_TIMEOUT="${WORKSPACE_DEV_START_TIMEOUT:-30}"

mkdir -p "$LOG_DIR" "$PID_DIR"

# ─── helpers ─────────────────────────────────────────────────────────────────

usage() {
  cat <<'EOF'
Usage:
  ./.scripts/workspace.sh up                start full stack
  ./.scripts/workspace.sh down              stop full stack (including orphans)
  ./.scripts/workspace.sh restart           down + up
  ./.scripts/workspace.sh status            quick status table
  ./.scripts/workspace.sh doctor            full diagnostic
  ./.scripts/workspace.sh logs [svc]        tail combined or single service log
  ./.scripts/workspace.sh check             validate prerequisites
  ./.scripts/workspace.sh kill-orphans      kill anything bound to our ports

Database (local Postgres in docker):
  ./.scripts/workspace.sh db-backup         dump local DB to backups/<ts>.sql.gz (custom format + gzip)
  ./.scripts/workspace.sh db-backups        list existing backups (newest first)
  ./.scripts/workspace.sh db-restore FILE   restore a backup into the local DB (drops + recreates)
  ./.scripts/workspace.sh db-shell          open psql against the local DB

Services: proxy core web redis
Override ports via env vars: PROXY_PORT, CORE_PORT, WEB_PORT, REDIS_PORT
Override DB via env vars: PG_CONTAINER, PG_USER, PG_DB, BACKUP_DIR
EOF
}

service_pid_file() { printf '%s/%s.pid\n' "$PID_DIR" "$1"; }
service_log_file() { printf '%s/%s.log\n' "$LOG_DIR" "$1"; }

service_port() {
  case "$1" in
    proxy) echo "$PROXY_PORT" ;;
    core)  echo "$CORE_PORT"  ;;
    web)   echo "$WEB_PORT"   ;;
    *)     return 1 ;;
  esac
}

service_health_path() {
  case "$1" in
    proxy) echo "$PROXY_HEALTH_PATH" ;;
    core)  echo "$CORE_HEALTH_PATH"  ;;
    web)   echo "$WEB_HEALTH_PATH"   ;;
    *)     return 1 ;;
  esac
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "missing command: $1"; exit 1; }
}

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "missing: $1"
    [[ -n "${2:-}" ]] && echo "$2"
    exit 1
  fi
}

# Returns the PIDs (one per line) currently bound to the given TCP port.
# Prefer `ss` on Linux: it works without elevated privileges, while `lsof`
# on WSL/some kernels returns empty for processes we own. Fall back to lsof
# only if `ss` isn't available.
pids_on_port() {
  local port="$1" out=""
  if command -v ss >/dev/null 2>&1; then
    out="$(ss -ltnp 2>/dev/null \
      | awk -v p=":$port" '$4 ~ p"$"' \
      | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u)"
  fi
  if [[ -z "$out" ]] && command -v lsof >/dev/null 2>&1; then
    out="$(lsof -ti TCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  fi
  printf '%s' "$out"
  [[ -n "$out" ]] && printf '\n'
}

port_in_use() {
  [[ -n "$(pids_on_port "$1")" ]]
}

# Wait until the given port has at least one LISTEN socket. Returns 0 on
# success, 1 on timeout.
wait_for_port() {
  local port="$1"
  local timeout="${2:-$START_TIMEOUT}"
  local i
  for i in $(seq 1 $((timeout * 4))); do
    port_in_use "$port" && return 0
    sleep 0.25
  done
  return 1
}

# Wait until an HTTP endpoint returns 2xx/3xx/4xx (anything that isn't a
# connection error). 5xx is acceptable: it means the server is up.
wait_for_http() {
  local url="$1"
  local timeout="${2:-$START_TIMEOUT}"
  local i code
  for i in $(seq 1 $((timeout * 2))); do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 2 "$url" 2>/dev/null || echo 000)"
    if [[ "$code" != "000" ]]; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

is_running() {
  local service="$1"
  local pid_file
  pid_file="$(service_pid_file "$service")"

  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
    rm -f "$pid_file"
  fi
  # Even if our PID file is stale, treat the port being busy as "running"
  # so downstream code can take corrective action.
  port_in_use "$(service_port "$service")"
}

# ─── start / stop ────────────────────────────────────────────────────────────

start_service() {
  local service="$1"
  local workdir="$2"
  shift 2

  local port log_file pid_file health_path health_url
  port="$(service_port "$service")"
  log_file="$(service_log_file "$service")"
  pid_file="$(service_pid_file "$service")"
  health_path="$(service_health_path "$service")"
  health_url="http://localhost:${port}${health_path}"

  if port_in_use "$port"; then
    local existing
    existing="$(pids_on_port "$port" | tr '\n' ' ')"
    echo "✗ port $port already in use by pid(s): $existing"
    echo "  run: make kill-orphans   (or stop the offending process)"
    return 1
  fi

  # Truncate the log so each run is self-contained and grep-friendly.
  : > "$log_file"

  (
    cd "$workdir"
    # NO_COLOR strips ANSI from libraries that honor it (django, pnpm).
    # GIN_MODE=release silences gin's banner and reduces color noise.
    NO_COLOR=1 GIN_MODE=release \
      nohup "$@" >"$log_file" 2>&1 &
    echo $! >"$pid_file"
  )

  local pid
  pid="$(cat "$pid_file")"

  if ! wait_for_port "$port" "$START_TIMEOUT"; then
    echo "✗ $service did not bind :$port within ${START_TIMEOUT}s (pid $pid)"
    echo "  --- last 30 log lines ---"
    tail -n 30 "$log_file" | sed 's/\x1b\[[0-9;]*[A-Za-z]//g' | sed 's/^/  /'
    return 1
  fi

  if ! wait_for_http "$health_url" "$START_TIMEOUT"; then
    echo "⚠ $service bound :$port but health check failed: $health_url"
    echo "  --- last 30 log lines ---"
    tail -n 30 "$log_file" | sed 's/\x1b\[[0-9;]*[A-Za-z]//g' | sed 's/^/  /'
    return 1
  fi

  echo "✓ started $service (pid $pid) on :$port"
}

# Stop the tracked PID and any leftover process bound to the service port.
stop_service() {
  local service="$1"
  local pid_file port
  pid_file="$(service_pid_file "$service")"
  port="$(service_port "$service")"

  local stopped=0

  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      _wait_for_exit "$pid" 5 || kill -9 "$pid" >/dev/null 2>&1 || true
      stopped=1
    fi
    rm -f "$pid_file"
  fi

  # Reap orphans bound to the port.
  local pids
  pids="$(pids_on_port "$port" || true)"
  if [[ -n "$pids" ]]; then
    echo "  killing orphan(s) on :$port: $(echo "$pids" | tr '\n' ' ')"
    # shellcheck disable=SC2086
    kill $pids >/dev/null 2>&1 || true
    sleep 1
    pids="$(pids_on_port "$port" || true)"
    if [[ -n "$pids" ]]; then
      # shellcheck disable=SC2086
      kill -9 $pids >/dev/null 2>&1 || true
    fi
    stopped=1
  fi

  if (( stopped == 1 )); then
    echo "✓ stopped $service"
  else
    echo "  $service was not running"
  fi
}

_wait_for_exit() {
  local pid="$1"
  local timeout="${2:-5}"
  local i
  for i in $(seq 1 $((timeout * 4))); do
    kill -0 "$pid" >/dev/null 2>&1 || return 0
    sleep 0.25
  done
  return 1
}

# ─── redis ───────────────────────────────────────────────────────────────────

redis_running() {
  docker ps --filter "name=^/${REDIS_CONTAINER_NAME}$" --format '{{.Names}}' \
    | grep -qx "$REDIS_CONTAINER_NAME"
}

start_redis() {
  require_cmd docker
  if redis_running; then
    echo "  redis already running (${REDIS_CONTAINER_NAME})"
    return 0
  fi
  if port_in_use "$REDIS_PORT"; then
    echo "✗ port $REDIS_PORT already in use (not by our redis container)"
    echo "  pid(s): $(pids_on_port "$REDIS_PORT" | tr '\n' ' ')"
    return 1
  fi
  docker run -d --rm \
    --name "$REDIS_CONTAINER_NAME" \
    -p "${REDIS_PORT}:6379" \
    redis:7-alpine >/dev/null
  local i
  for i in $(seq 1 40); do
    if docker exec "$REDIS_CONTAINER_NAME" redis-cli ping >/dev/null 2>&1; then
      echo "✓ started redis (${REDIS_CONTAINER_NAME}) on ${REDIS_URL}"
      return 0
    fi
    sleep 0.25
  done
  echo "✗ redis did not become ready"
  return 1
}

stop_redis() {
  if ! redis_running; then
    echo "  redis was not running"
    return 0
  fi
  docker stop "$REDIS_CONTAINER_NAME" >/dev/null
  echo "✓ stopped redis"
}

# ─── checks ──────────────────────────────────────────────────────────────────

check_workspace() {
  require_cmd pnpm
  require_cmd go
  require_cmd python3
  require_cmd docker
  require_cmd curl

  require_file "$ROOT_DIR/web/package.json"      "install web deps: cd web && pnpm install"
  require_file "$ROOT_DIR/proxy/go.mod"          "proxy repository is incomplete"
  require_file "$ROOT_DIR/core/manage.py"        "core repository is incomplete"
  require_file "$ROOT_DIR/core/.venv/bin/python" \
    "create the core virtualenv: cd core && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  require_file "$ROOT_DIR/web/.env"              "create web/.env from web/.env.example"
  require_file "$ROOT_DIR/core/.env"             "create core/.env from core/.env.example"
  require_file "$ROOT_DIR/proxy/.env"            "create proxy/.env from proxy/.env.example"

  echo "✓ workspace checks passed"
}

# ─── lifecycle ───────────────────────────────────────────────────────────────

cmd_up() {
  check_workspace
  start_redis
  start_service "proxy" "$ROOT_DIR/proxy" \
    env "REDIS_URL=${REDIS_URL}" go run ./cmd/api
  start_service "core" "$ROOT_DIR/core" \
    env "REDIS_URL=${REDIS_URL}" "$ROOT_DIR/core/.venv/bin/python" manage.py runserver
  start_service "web" "$ROOT_DIR/web" pnpm run dev

  cat <<EOF

local stack started
  web:   http://localhost:${WEB_PORT}
  core:  http://localhost:${CORE_PORT}/api/
  proxy: http://localhost:${PROXY_PORT}${PROXY_HEALTH_PATH}
  redis: ${REDIS_URL}

next:
  make status      compact health table
  make doctor      full diagnostic
  make logs        combined log tail
  make tail-proxy  follow proxy log
  make down        stop everything
EOF
}

cmd_down() {
  stop_service "web"
  stop_service "core"
  stop_service "proxy"
  stop_redis
}

cmd_restart() {
  cmd_down
  echo
  cmd_up
}

cmd_kill_orphans() {
  local svc port pids any=0
  for svc in proxy core web; do
    port="$(service_port "$svc")"
    pids="$(pids_on_port "$port" || true)"
    if [[ -n "$pids" ]]; then
      any=1
      echo "  $svc :$port → killing $(echo "$pids" | tr '\n' ' ')"
      # shellcheck disable=SC2086
      kill $pids >/dev/null 2>&1 || true
    fi
    rm -f "$(service_pid_file "$svc")"
  done
  sleep 1
  for svc in proxy core web; do
    port="$(service_port "$svc")"
    pids="$(pids_on_port "$port" || true)"
    if [[ -n "$pids" ]]; then
      # shellcheck disable=SC2086
      kill -9 $pids >/dev/null 2>&1 || true
    fi
  done
  if (( any == 0 )); then
    echo "no orphans on :${PROXY_PORT}/:${CORE_PORT}/:${WEB_PORT}"
  else
    echo "✓ orphans cleared"
  fi
}

# ─── status & doctor ─────────────────────────────────────────────────────────

# Returns 0 if `ancestor` is a parent of `pid` (or equal). Walks /proc up
# to the root.
_pid_descends_from() {
  local pid="$1" ancestor="$2" hops=0
  while [[ -n "$pid" && "$pid" != "0" && "$pid" != "1" && $hops -lt 32 ]]; do
    [[ "$pid" == "$ancestor" ]] && return 0
    pid="$(awk '/^PPid:/{print $2; exit}' "/proc/$pid/status" 2>/dev/null || echo '')"
    hops=$((hops + 1))
  done
  return 1
}

_status_row() {
  local svc port listeners tracked status
  svc="$1"
  port="$(service_port "$svc")"
  listeners="$(pids_on_port "$port")"
  tracked="$(cat "$(service_pid_file "$svc")" 2>/dev/null || echo '')"

  if [[ -z "$listeners" ]]; then
    status="stopped"
  elif [[ -z "$tracked" ]]; then
    status="ORPHAN"
  else
    status="ORPHAN"
    local lp
    while IFS= read -r lp; do
      [[ -z "$lp" ]] && continue
      if [[ "$lp" == "$tracked" ]] || _pid_descends_from "$lp" "$tracked"; then
        status="running"
        break
      fi
    done <<<"$listeners"
  fi

  printf '  %-6s :%-5s  status=%-8s tracked=%-7s listener=%s\n' \
    "$svc" "$port" "$status" "${tracked:--}" "$(echo "$listeners" | tr '\n' ',' | sed 's/,$//' | sed 's/^$/-/')"
}

cmd_status() {
  if redis_running; then
    echo "  redis  :${REDIS_PORT}  status=running  container=${REDIS_CONTAINER_NAME}"
  else
    echo "  redis  :${REDIS_PORT}  status=stopped"
  fi
  for svc in proxy core web; do
    _status_row "$svc"
  done
}

cmd_doctor() {
  echo "▸ workspace"
  echo "  root: $ROOT_DIR"

  echo
  echo "▸ tools"
  for c in node pnpm go python3 docker curl; do
    if command -v "$c" >/dev/null 2>&1; then
      printf '  %-7s ✓ %s\n' "$c" "$(command -v "$c")"
    else
      printf '  %-7s ✗ MISSING\n' "$c"
    fi
  done

  echo
  echo "▸ env files"
  for f in core/.env web/.env proxy/.env; do
    if [[ -f "$ROOT_DIR/$f" ]]; then
      printf '  %-12s ✓\n' "$f"
    else
      printf '  %-12s ✗ MISSING\n' "$f"
    fi
  done
  if [[ ! -x "$ROOT_DIR/core/.venv/bin/python" ]]; then
    echo "  core/.venv   ✗ MISSING (cd core && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt)"
  else
    echo "  core/.venv   ✓"
  fi

  echo
  echo "▸ services"
  cmd_status

  echo
  echo "▸ health endpoints"
  for svc in proxy core; do
    local port path url code
    port="$(service_port "$svc")"
    path="$(service_health_path "$svc")"
    url="http://localhost:${port}${path}"
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 2 "$url" 2>/dev/null || echo 000)"
    printf '  %-6s %s → HTTP %s\n' "$svc" "$url" "$code"
  done

  echo
  echo "▸ redis"
  if redis_running; then
    if docker exec "$REDIS_CONTAINER_NAME" redis-cli ping 2>/dev/null | grep -q PONG; then
      echo "  ping: PONG ✓"
    else
      echo "  ping: FAIL ✗"
    fi
  else
    echo "  not running"
  fi

  echo
  echo "▸ django"
  if [[ -x "$ROOT_DIR/core/.venv/bin/python" ]]; then
    local pending
    pending="$(cd "$ROOT_DIR/core" && .venv/bin/python manage.py showmigrations --plan 2>/dev/null \
      | grep -c '\[ \]' || true)"
    if [[ "$pending" == "0" ]]; then
      echo "  migrations: all applied ✓"
    else
      echo "  migrations: ${pending} unapplied ✗  (run: cd core && .venv/bin/python manage.py migrate)"
    fi
  fi

  echo
  echo "▸ recent log tails (last 5 lines, color-stripped)"
  for svc in proxy core web; do
    local lf
    lf="$(service_log_file "$svc")"
    echo "  --- $svc ---"
    if [[ -f "$lf" ]]; then
      tail -n 5 "$lf" | sed 's/\x1b\[[0-9;]*[A-Za-z]//g' | sed 's/^/    /'
    else
      echo "    (no log file)"
    fi
  done
}

# ─── logs ────────────────────────────────────────────────────────────────────

cmd_logs() {
  local service="${1:-}"

  if [[ -n "$service" ]]; then
    if [[ "$service" == "redis" ]]; then
      exec docker logs -f "$REDIS_CONTAINER_NAME"
    fi
    local lf
    lf="$(service_log_file "$service")"
    [[ -f "$lf" ]] || { echo "no log file: $lf"; exit 1; }
    # Strip ANSI on the fly so grep / paging work.
    exec sh -c "tail -n 60 -f \"$lf\" | sed -u 's/\x1b\[[0-9;]*[A-Za-z]//g'"
  fi

  echo "==> redis <=="
  if redis_running; then
    docker logs --tail 20 "$REDIS_CONTAINER_NAME"
  else
    echo "not running"
  fi
  echo

  for name in proxy core web; do
    echo "==> $name <=="
    local lf
    lf="$(service_log_file "$name")"
    if [[ -f "$lf" ]]; then
      tail -n 20 "$lf" | sed 's/\x1b\[[0-9;]*[A-Za-z]//g'
    else
      echo "no log file"
    fi
    echo
  done
}

# ─── database (local Postgres in docker) ─────────────────────────────────────
#
# Lessons baked in:
#   * NEVER use `docker exec -t` for pg_dump: the TTY mangles the binary
#     stream and the resulting dump fails `pg_restore --list` with EOF.
#   * Always produce a custom-format dump (-Fc) so we can `pg_restore` it
#     anywhere (including Dokploy's UI, which wraps pg_restore + gunzip).
#   * After dumping, validate with `pg_restore --list` so corruption is
#     caught immediately instead of months later in production.
#   * `restore` drops & recreates the DB to avoid object collisions, and
#     stops `core` first so no connections block the DROP.

pg_container_running() {
  docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"
}

require_pg_container() {
  if ! pg_container_running; then
    echo "✗ postgres container '$PG_CONTAINER' is not running"
    echo "  start it (e.g. \`docker start $PG_CONTAINER\`) or override PG_CONTAINER=<name>"
    exit 1
  fi
}

cmd_db_backup() {
  require_cmd docker
  require_cmd gzip
  require_pg_container

  mkdir -p "$BACKUP_DIR"
  local ts file raw
  ts="$(date -u +%Y-%m-%dT%H_%M_%SZ)"
  file="$BACKUP_DIR/denn-db-$ts.sql.gz"
  raw="$BACKUP_DIR/.denn-db-$ts.dump"

  echo "→ dumping $PG_DB from container '$PG_CONTAINER' (custom format)…"
  # NOTE: `exec` (no -t!) keeps the binary stream intact.
  if ! docker exec "$PG_CONTAINER" \
        pg_dump -U "$PG_USER" -d "$PG_DB" \
        -Fc --no-owner --no-privileges > "$raw"; then
    rm -f "$raw"
    echo "✗ pg_dump failed"
    exit 1
  fi

  echo "→ validating archive…"
  if ! docker exec -i "$PG_CONTAINER" pg_restore --list < "$raw" >/dev/null; then
    rm -f "$raw"
    echo "✗ dump is corrupt (pg_restore --list rejected it)"
    exit 1
  fi

  gzip -c "$raw" > "$file"
  rm -f "$raw"

  local size
  size="$(du -h "$file" | cut -f1)"
  echo "✓ wrote $file ($size)"
  echo
  echo "  restore locally:    make db-restore FILE=$file"
  echo "  upload to Dokploy:  use this file as-is in the restore UI (custom-format + gzip)"
}

cmd_db_backups() {
  if [[ ! -d "$BACKUP_DIR" ]]; then
    echo "(no backups yet — run \`make db-backup\`)"
    return 0
  fi
  shopt -s nullglob
  local files=("$BACKUP_DIR"/denn-db-*.sql.gz)
  shopt -u nullglob
  if (( ${#files[@]} == 0 )); then
    echo "(no backups yet — run \`make db-backup\`)"
    return 0
  fi
  ls -1ht "${files[@]}"
}

cmd_db_restore() {
  local file="${1:-}"
  if [[ -z "$file" ]]; then
    echo "usage: $0 db-restore <path/to/dump.sql.gz>"
    exit 1
  fi
  if [[ ! -f "$file" ]]; then
    echo "✗ file not found: $file"
    exit 1
  fi
  require_cmd docker
  require_cmd gunzip
  require_pg_container

  echo "→ stopping core (so it releases its DB connections)…"
  stop_service core || true

  local tmp_in_container="/tmp/denn-restore-$(date -u +%s).dump"
  echo "→ copying $file → $PG_CONTAINER:$tmp_in_container (decompressed)…"
  if ! gunzip -c "$file" | docker exec -i "$PG_CONTAINER" \
        sh -c "cat > $tmp_in_container"; then
    echo "✗ failed to copy dump into container"
    exit 1
  fi

  echo "→ validating archive inside container…"
  if ! docker exec "$PG_CONTAINER" pg_restore --list "$tmp_in_container" >/dev/null; then
    docker exec "$PG_CONTAINER" rm -f "$tmp_in_container" || true
    echo "✗ dump is not a valid custom-format pg_restore archive"
    echo "  (was it produced with \`docker exec -t\`? that flag corrupts the stream — re-dump without -t)"
    exit 1
  fi

  echo "→ dropping & recreating database '$PG_DB'…"
  docker exec -i "$PG_CONTAINER" \
    psql -U "$PG_USER" -d postgres -v ON_ERROR_STOP=1 <<EOF
SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
 WHERE datname = '$PG_DB' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS $PG_DB;
CREATE DATABASE $PG_DB OWNER $PG_USER;
EOF

  echo "→ pg_restore…"
  if ! docker exec "$PG_CONTAINER" \
        pg_restore -U "$PG_USER" -d "$PG_DB" \
        --no-owner --no-privileges --exit-on-error \
        "$tmp_in_container"; then
    docker exec "$PG_CONTAINER" rm -f "$tmp_in_container" || true
    echo "✗ pg_restore failed"
    exit 1
  fi

  docker exec "$PG_CONTAINER" rm -f "$tmp_in_container" || true

  echo
  echo "✓ restore complete. last applied content migrations:"
  docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -c \
    "SELECT app, name FROM django_migrations WHERE app='content' ORDER BY id DESC LIMIT 5;" || true

  echo
  echo "→ run \`make up\` to bring core back online."
}

cmd_db_shell() {
  require_cmd docker
  require_pg_container
  exec docker exec -it "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB"
}

# ─── dispatch ────────────────────────────────────────────────────────────────

case "${1:-}" in
  up)            cmd_up ;;
  down)          cmd_down ;;
  restart)       cmd_restart ;;
  status)        cmd_status ;;
  doctor)        cmd_doctor ;;
  logs)          cmd_logs "${2:-}" ;;
  check)         check_workspace ;;
  kill-orphans)  cmd_kill_orphans ;;
  db-backup)     cmd_db_backup ;;
  db-backups)    cmd_db_backups ;;
  db-restore)    cmd_db_restore "${2:-}" ;;
  db-shell)      cmd_db_shell ;;
  *)             usage; exit 1 ;;
esac
