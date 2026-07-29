#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.workspace"
COMPOSE_FILE="$ROOT_DIR/compose.local.yml"
COMPOSE_ENV_FILE="$STATE_DIR/compose.env"
ENV_STORE_DIR="${DENN_LOCAL_ENV_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/denn/local}"
INSTANCE_STATE_DIR="${DENN_LOCAL_INSTANCE_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/denn/local/instances}"

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"

INSTANCE_ID=""
PROJECT_NAME=""
WEB_PORT=""
CORE_PORT=""
PROXY_PORT=""
POSTGRES_PORT=""
REDIS_PORT=""
INSTANCE_STATE_FILE=""
LOCAL_DB_USER=""
LOCAL_DB_PASSWORD=""
LOCAL_DB_NAME=""

usage() {
  cat <<'EOF'
Usage:
  ./.scripts/workspace.sh check
  ./.scripts/workspace.sh setup-local
  ./.scripts/workspace.sh up
  ./.scripts/workspace.sh down
  ./.scripts/workspace.sh destroy
  ./.scripts/workspace.sh restart
  ./.scripts/workspace.sh restart-service <web|core|proxy>
  ./.scripts/workspace.sh status
  ./.scripts/workspace.sh doctor
  ./.scripts/workspace.sh smoke-local
  ./.scripts/workspace.sh browser-local
  ./.scripts/workspace.sh logs [web|core|proxy|postgres|redis]
  ./.scripts/workspace.sh env-store
  ./.scripts/workspace.sh env-link

Database:
  ./.scripts/workspace.sh db-backup
  ./.scripts/workspace.sh db-backups
  ./.scripts/workspace.sh db-restore FILE
  ./.scripts/workspace.sh local-clone FILE
  ./.scripts/workspace.sh db-shell
  ./.scripts/workspace.sh test-core

Instance selection:
  INSTANCE=<slug> selects the Compose project for this worktree.
  WEB_PORT=<port> selects the host frontend port for a new instance.
  The remaining host ports are derived from WEB_PORT.

  make local-up INSTANCE=feature-a WEB_PORT=3000
  make local-status INSTANCE=feature-a
  make local-destroy INSTANCE=feature-a

Environment store:
  DENN_LOCAL_ENV_DIR defaults to ~/.config/denn/local.
  It contains private web.env, core.env and proxy.env files shared by symlink.

Instance state:
  DENN_LOCAL_INSTANCE_DIR defaults to ~/.config/denn/local/instances.
  It contains only non-secret allocation metadata and a lock.
EOF
}

fail() {
  echo "✗ $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"
}

read_env_value() {
  local file="$1"
  local key="$2"
  local value

  value="$(
    awk -v key="$key" '
      $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
        sub("^[[:space:]]*" key "[[:space:]]*=[[:space:]]*", "")
        value = $0
      }
      END { print value }
    ' "$file"
  )"
  value="${value%$'\r'}"

  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf '%s' "$value"
}

slugify() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/^$/instance/' \
    | cut -c1-48 \
    | sed -E 's/-+$//; s/^$/instance/'
}

default_instance_id() {
  local branch worktree_git_dir worktree_id
  branch="$(git -C "$ROOT_DIR" branch --show-current 2>/dev/null || true)"
  if [[ -n "$branch" ]]; then
    slugify "$branch"
    return 0
  fi

  worktree_git_dir="$(git -C "$ROOT_DIR" rev-parse --git-dir 2>/dev/null || true)"
  worktree_id="$(basename "$worktree_git_dir")"
  if [[ -n "$worktree_id" && "$worktree_id" != ".git" ]]; then
    slugify "wt-$worktree_id"
  else
    slugify "wt-$(basename "$ROOT_DIR")"
  fi
}

validate_port() {
  local name="$1"
  local value="$2"
  [[ "$value" =~ ^[0-9]+$ ]] || fail "$name must be a numeric TCP port"
  (( value >= 1024 && value <= 65535 )) || fail "$name must be between 1024 and 65535"
}

port_is_free() {
  local port="$1"
  ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

port_block_is_free() {
  local web_port="$1"
  local port
  for port in \
    "$web_port" \
    "$((web_port + 5000))" \
    "$((web_port + 5080))" \
    "$((web_port + 2432))" \
    "$((web_port + 3390))"; do
    validate_port "derived port" "$port"
    port_is_free "$port" || return 1
  done
}

acquire_port_lock() {
  mkdir -p "$INSTANCE_STATE_DIR"
  chmod 700 "$INSTANCE_STATE_DIR"

  local lock_dir="$INSTANCE_STATE_DIR/.port-allocation.lock"
  local attempt=0
  while ! mkdir "$lock_dir" 2>/dev/null; do
    attempt=$((attempt + 1))
    (( attempt < 100 )) || fail \
      "could not acquire the local port allocation lock at $lock_dir; remove it only after confirming no other Denn setup is running"
    sleep 0.1
  done
  printf '%s\n' "$$" >"$lock_dir/pid"
}

release_port_lock() {
  local lock_dir="$INSTANCE_STATE_DIR/.port-allocation.lock"
  if [[ -d "$lock_dir" ]]; then
    rm -f "$lock_dir/pid"
    rmdir "$lock_dir" 2>/dev/null || true
  fi
}

resolve_instance_id() {
  local requested existing
  requested="${INSTANCE:-${DENN_INSTANCE:-}}"
  existing=""
  if [[ -f "$COMPOSE_ENV_FILE" ]]; then
    existing="$(read_env_value "$COMPOSE_ENV_FILE" INSTANCE_ID)"
  fi

  if [[ -n "$requested" && -n "$existing" && "$(slugify "$requested")" != "$existing" ]]; then
    fail "this worktree is already assigned to instance '$existing'; use that instance or remove its local stack first"
  fi

  INSTANCE_ID="$(slugify "${requested:-${existing:-$(default_instance_id)}}")"
  PROJECT_NAME="denn-$INSTANCE_ID"
  INSTANCE_STATE_FILE="$INSTANCE_STATE_DIR/$INSTANCE_ID.env"
}

reservation_block_is_free() {
  local web_port="$1"
  local port file key
  shopt -s nullglob
  local files=("$INSTANCE_STATE_DIR"/*.env)
  shopt -u nullglob
  for port in \
    "$web_port" \
    "$((web_port + 5000))" \
    "$((web_port + 5080))" \
    "$((web_port + 2432))" \
    "$((web_port + 3390))"; do
    for file in "${files[@]}"; do
      [[ "$file" == "$INSTANCE_STATE_FILE" ]] && continue
      for key in WEB_PORT CORE_PORT PROXY_PORT POSTGRES_PORT REDIS_PORT; do
        if [[ "$(read_env_value "$file" "$key")" == "$port" ]]; then
          return 1
        fi
      done
    done
  done
  return 0
}

calculate_derived_ports() {
  validate_port WEB_PORT "$WEB_PORT"
  CORE_PORT=$((WEB_PORT + 5000))
  PROXY_PORT=$((WEB_PORT + 5080))
  POSTGRES_PORT=$((WEB_PORT + 2432))
  REDIS_PORT=$((WEB_PORT + 3390))
  validate_port CORE_PORT "$CORE_PORT"
  validate_port PROXY_PORT "$PROXY_PORT"
  validate_port POSTGRES_PORT "$POSTGRES_PORT"
  validate_port REDIS_PORT "$REDIS_PORT"
}

validate_port_block() {
  local web_port="$1"
  local port
  validate_port WEB_PORT "$web_port"
  for port in \
    "$((web_port + 5000))" \
    "$((web_port + 5080))" \
    "$((web_port + 2432))" \
    "$((web_port + 3390))"; do
    validate_port "derived port" "$port"
  done
}

write_instance_reservation() {
  local temporary_file
  temporary_file="$(mktemp "$INSTANCE_STATE_DIR/.${INSTANCE_ID}.XXXXXX")"
  chmod 600 "$temporary_file"
  {
    printf 'INSTANCE_ID=%s\n' "$INSTANCE_ID"
    printf 'COMPOSE_PROJECT_NAME=%s\n' "$PROJECT_NAME"
    printf 'WEB_PORT=%s\n' "$WEB_PORT"
    printf 'CORE_PORT=%s\n' "$CORE_PORT"
    printf 'PROXY_PORT=%s\n' "$PROXY_PORT"
    printf 'POSTGRES_PORT=%s\n' "$POSTGRES_PORT"
    printf 'REDIS_PORT=%s\n' "$REDIS_PORT"
  } >"$temporary_file"
  mv "$temporary_file" "$INSTANCE_STATE_FILE"
  chmod 600 "$INSTANCE_STATE_FILE"
}

resolve_instance_ports() {
  local requested_web existing_web candidate
  requested_web="${WEB_PORT:-${DENN_WEB_PORT:-}}"
  existing_web=""
  if [[ -f "$COMPOSE_ENV_FILE" ]]; then
    existing_web="$(read_env_value "$COMPOSE_ENV_FILE" WEB_PORT)"
  fi

  if [[ -n "$requested_web" && -n "$existing_web" && "$requested_web" != "$existing_web" ]]; then
    fail "instance '$INSTANCE_ID' is already assigned to web port $existing_web"
  fi

  if [[ -n "$existing_web" ]]; then
    validate_port_block "$existing_web"
  elif [[ -n "$requested_web" ]]; then
    validate_port_block "$requested_web"
  fi

  acquire_port_lock
  if [[ -n "$existing_web" ]]; then
    WEB_PORT="$existing_web"
    calculate_derived_ports
    if ! reservation_block_is_free "$WEB_PORT"; then
      release_port_lock
      fail "instance '$INSTANCE_ID' conflicts with another reserved local port block"
    fi
  elif [[ -n "$requested_web" ]]; then
    WEB_PORT="$requested_web"
    calculate_derived_ports
    if ! port_block_is_free "$WEB_PORT" || ! reservation_block_is_free "$WEB_PORT"; then
      release_port_lock
      fail "the requested local port block starting at $WEB_PORT is already in use"
    fi
  else
    candidate=3000
    while (( candidate <= 3099 )); do
      if port_block_is_free "$candidate" && reservation_block_is_free "$candidate"; then
        WEB_PORT="$candidate"
        break
      fi
      candidate=$((candidate + 1))
    done
    if (( candidate > 3099 )); then
      release_port_lock
      fail "no free local port block found in the 3000-3099 range"
    fi
    calculate_derived_ports
  fi

  write_instance_reservation
  release_port_lock
}

require_env_value() {
  local file="$1"
  local key="$2"
  [[ -n "$(read_env_value "$file" "$key")" ]] \
    || fail "missing non-empty $key in ${file#"$ROOT_DIR"/}"
}

env_files_present() {
  [[ -f "$ROOT_DIR/web/.env" ]] \
    && [[ -f "$ROOT_DIR/core/.env" ]] \
    && [[ -f "$ROOT_DIR/proxy/.env" ]]
}

require_env_files() {
  env_files_present || fail \
    "local env files are missing; create them or run 'make env-link' after 'make env-store' in another worktree"

  chmod 600 "$ROOT_DIR/web/.env" "$ROOT_DIR/core/.env" "$ROOT_DIR/proxy/.env"
}

assert_local_http_url() {
  local file="$1"
  local key="$2"
  local path="$3"
  local optional="${4:-false}"
  local value
  value="$(read_env_value "$file" "$key")"

  if [[ -z "$value" && "$optional" == "true" ]]; then
    return 0
  fi

  [[ "$value" =~ ^http://(127\.0\.0\.1|localhost):[0-9]+${path}/?$ ]] \
    || fail "$key in ${file#"$ROOT_DIR"/} must point to a loopback HTTP service"
}

parse_local_database_url() {
  local database_url
  database_url="$(read_env_value "$ROOT_DIR/core/.env" "DATABASE_URL")"

  if [[ "$database_url" =~ ^postgres(ql)?://([^:]+):([^@]+)@(127\.0\.0\.1|localhost):[0-9]+/([^?]+)(\?.*)?$ ]]; then
    LOCAL_DB_USER="${BASH_REMATCH[2]}"
    LOCAL_DB_PASSWORD="${BASH_REMATCH[3]}"
    LOCAL_DB_NAME="${BASH_REMATCH[5]}"
  else
    fail "DATABASE_URL in core/.env must point to local PostgreSQL on loopback"
  fi

  [[ "$LOCAL_DB_USER" =~ ^[A-Za-z0-9_]+$ ]] \
    || fail "the local database user contains unsupported characters"
  [[ "$LOCAL_DB_PASSWORD" =~ ^[A-Za-z0-9._~-]+$ ]] \
    || fail "the local database password must use URL-safe characters"
  [[ "$LOCAL_DB_NAME" =~ ^[A-Za-z0-9_]+$ ]] \
    || fail "the local database name contains unsupported characters"
}

guard_local_env() {
  require_env_files

  assert_local_http_url "$ROOT_DIR/web/.env" "API_URL" "/api"
  assert_local_http_url "$ROOT_DIR/web/.env" "PROXY_API_URL" "/v1/proxy"
  assert_local_http_url "$ROOT_DIR/web/.env" "NEXT_PUBLIC_API_URL" "/api" true
  assert_local_http_url "$ROOT_DIR/web/.env" "NEXT_PUBLIC_PROXY_API_URL" "/v1/proxy" true
  assert_local_http_url "$ROOT_DIR/core/.env" "PROXY_API_BASE_URL" "/v1/proxy"
  parse_local_database_url

  local debug core_cookie web_cookie
  debug="$(read_env_value "$ROOT_DIR/core/.env" "DEBUG" | tr '[:upper:]' '[:lower:]')"
  core_cookie="$(read_env_value "$ROOT_DIR/core/.env" "AUTH_COOKIE_SECURE" | tr '[:upper:]' '[:lower:]')"
  web_cookie="$(read_env_value "$ROOT_DIR/web/.env" "AUTH_COOKIE_SECURE" | tr '[:upper:]' '[:lower:]')"
  [[ "$debug" == "true" || "$debug" == "1" ]] \
    || fail "DEBUG in core/.env must be true for local development"
  [[ "$core_cookie" == "false" || "$core_cookie" == "0" ]] \
    || fail "AUTH_COOKIE_SECURE in core/.env must be false for local HTTP"
  [[ "$web_cookie" == "false" || "$web_cookie" == "0" ]] \
    || fail "AUTH_COOKIE_SECURE in web/.env must be false for local HTTP"

  local web_key core_key proxy_key
  require_env_value "$ROOT_DIR/web/.env" "PROXY_API_KEY"
  require_env_value "$ROOT_DIR/core/.env" "PROXY_API_KEY"
  require_env_value "$ROOT_DIR/proxy/.env" "API_KEY"
  web_key="$(read_env_value "$ROOT_DIR/web/.env" "PROXY_API_KEY")"
  core_key="$(read_env_value "$ROOT_DIR/core/.env" "PROXY_API_KEY")"
  proxy_key="$(read_env_value "$ROOT_DIR/proxy/.env" "API_KEY")"
  [[ "$web_key" == "$core_key" && "$core_key" == "$proxy_key" ]] \
    || fail "web:PROXY_API_KEY, core:PROXY_API_KEY and proxy:API_KEY must match"
  [[ "$web_key" =~ ^[A-Za-z0-9._~+=/-]+$ ]] \
    || fail "the shared proxy key contains characters unsupported by the local smoke runner"

  local public_secret
  for public_secret in \
    NEXT_PUBLIC_PROXY_API_KEY \
    VITE_PROXY_API_KEY \
    PUBLIC_PROXY_API_KEY; do
    [[ -z "$(read_env_value "$ROOT_DIR/web/.env" "$public_secret")" ]] \
      || fail "$public_secret is forbidden because PROXY_API_KEY is server-only"
  done

  local provider_key
  for provider_key in \
    TMDB_API_KEY \
    IGDB_CLIENT_ID \
    IGDB_CLIENT_SECRET \
    SPOTIFY_CLIENT_ID \
    SPOTIFY_CLIENT_SECRET; do
    require_env_value "$ROOT_DIR/proxy/.env" "$provider_key"
  done
}

prepare_compose_env() {
  guard_local_env
  resolve_instance_id
  resolve_instance_ports
  mkdir -p "$STATE_DIR"
  chmod 700 "$STATE_DIR"

  local temporary_file
  temporary_file="$(mktemp "$STATE_DIR/compose.env.XXXXXX")"
  chmod 600 "$temporary_file"
  {
    printf 'COMPOSE_PROJECT_NAME=%s\n' "$PROJECT_NAME"
    printf 'INSTANCE_ID=%s\n' "$INSTANCE_ID"
    printf 'WEB_PORT=%s\n' "$WEB_PORT"
    printf 'CORE_PORT=%s\n' "$CORE_PORT"
    printf 'PROXY_PORT=%s\n' "$PROXY_PORT"
    printf 'POSTGRES_PORT=%s\n' "$POSTGRES_PORT"
    printf 'REDIS_PORT=%s\n' "$REDIS_PORT"
    printf 'LOCAL_DB_USER=%s\n' "$LOCAL_DB_USER"
    printf 'LOCAL_DB_PASSWORD=%s\n' "$LOCAL_DB_PASSWORD"
    printf 'LOCAL_DB_NAME=%s\n' "$LOCAL_DB_NAME"
  } >"$temporary_file"
  mv "$temporary_file" "$COMPOSE_ENV_FILE"
  chmod 600 "$COMPOSE_ENV_FILE"
}

load_instance_from_compose_env() {
  [[ -f "$COMPOSE_ENV_FILE" ]] || return 1

  INSTANCE_ID="$(read_env_value "$COMPOSE_ENV_FILE" INSTANCE_ID)"
  PROJECT_NAME="$(read_env_value "$COMPOSE_ENV_FILE" COMPOSE_PROJECT_NAME)"
  WEB_PORT="$(read_env_value "$COMPOSE_ENV_FILE" WEB_PORT)"
  CORE_PORT="$(read_env_value "$COMPOSE_ENV_FILE" CORE_PORT)"
  PROXY_PORT="$(read_env_value "$COMPOSE_ENV_FILE" PROXY_PORT)"
  POSTGRES_PORT="$(read_env_value "$COMPOSE_ENV_FILE" POSTGRES_PORT)"
  REDIS_PORT="$(read_env_value "$COMPOSE_ENV_FILE" REDIS_PORT)"
  INSTANCE_STATE_FILE="$INSTANCE_STATE_DIR/$INSTANCE_ID.env"

  [[ -n "$INSTANCE_ID" && -n "$PROJECT_NAME" ]] \
    || fail "local Compose metadata is incomplete; refusing to destroy an unknown stack"
}

compose() {
  docker compose \
    --env-file "$COMPOSE_ENV_FILE" \
    --file "$COMPOSE_FILE" \
    "$@"
}

print_instance_info() {
  echo "  instance: $INSTANCE_ID"
  echo "  project:  $PROJECT_NAME"
  echo "  web:      http://127.0.0.1:$WEB_PORT"
  echo "  core:     http://127.0.0.1:$CORE_PORT/api/"
  echo "  proxy:    http://127.0.0.1:$PROXY_PORT/v1/proxy/"
  echo "  postgres: 127.0.0.1:$POSTGRES_PORT"
  echo "  redis:    127.0.0.1:$REDIS_PORT"
}

check_prerequisites() {
  require_cmd docker
  require_cmd curl
  require_cmd gzip
  require_cmd gunzip
  require_cmd lsof
  docker compose version >/dev/null 2>&1 \
    || fail "Docker Compose v2 is required"
  docker info >/dev/null 2>&1 \
    || fail "Docker is installed but its daemon is unavailable"
}

cmd_check() {
  check_prerequisites
  guard_local_env
  echo "✓ Docker, Compose, curl and local env guardrails are ready"
}

cmd_setup_local() {
  check_prerequisites
  prepare_compose_env

  compose pull postgres redis
  compose build proxy core web
  echo "✓ local images and isolated resources for $PROJECT_NAME are ready"
  print_instance_info
  echo "  next: make up"
}

cmd_up() {
  check_prerequisites
  prepare_compose_env
  compose up \
    --detach \
    --build \
    --remove-orphans \
    --wait \
    --wait-timeout 120 \
    postgres redis proxy core web
  echo
  cmd_status
  echo
  echo "✓ local app ($PROJECT_NAME)"
  print_instance_info
}

cmd_down() {
  check_prerequisites
  [[ -f "$COMPOSE_ENV_FILE" ]] || prepare_compose_env
  compose down --remove-orphans
  echo "✓ local stack stopped; database volume for $PROJECT_NAME was preserved"
}

cmd_restart() {
  cmd_down
  cmd_up
}

cmd_restart_service() {
  local service="${1:-}"
  case "$service" in
    web|core|proxy) ;;
    *) fail "service must be web, core or proxy" ;;
  esac

  check_prerequisites
  prepare_compose_env
  compose restart "$service"
  compose up --detach --wait --wait-timeout 120 "$service"
}

cmd_status() {
  check_prerequisites
  [[ -f "$COMPOSE_ENV_FILE" ]] || prepare_compose_env
  compose ps
}

http_check() {
  local name="$1"
  local url="$2"
  curl --fail --silent --show-error --max-time 15 "$url" >/dev/null \
    || fail "$name is not healthy at $url"
  echo "✓ $name"
}

assert_loopback_ports() {
  local service container binding
  for service in postgres redis proxy core web; do
    container="$(compose ps -q "$service")"
    [[ -n "$container" ]] || fail "expected service is missing: $service"
    while IFS= read -r binding; do
      [[ -z "$binding" || "$binding" == "127.0.0.1" ]] \
        || fail "$service publishes a port outside loopback: $binding"
    done < <(
      docker inspect \
        --format '{{ range $bindings := .NetworkSettings.Ports }}{{ range $bindings }}{{ println .HostIp }}{{ end }}{{ end }}' \
        "$container"
    )
  done
  echo "✓ every published port is bound to 127.0.0.1"
}

cmd_smoke_local() {
  check_prerequisites
  prepare_compose_env

  http_check "proxy health" "http://127.0.0.1:$PROXY_PORT/v1/proxy/health"
  http_check "core health" "http://127.0.0.1:$CORE_PORT/api/"
  http_check "web" "http://127.0.0.1:$WEB_PORT/"

  local proxy_key
  proxy_key="$(read_env_value "$ROOT_DIR/proxy/.env" "API_KEY")"
  printf 'header = "X-Api-Key: %s"\nheader = "X-Api-Consumer: local-smoke"\n' "$proxy_key" \
    | curl \
      --config - \
      --fail \
      --silent \
      --show-error \
      --max-time 20 \
      "http://127.0.0.1:$PROXY_PORT/v1/proxy/homepage?limit=1" \
      >/dev/null \
    || fail "authenticated local proxy request failed"
  echo "✓ authenticated proxy request"

  if compose exec -T core \
      python manage.py showmigrations --plan 2>/dev/null \
      | grep -q '\[ \]'; then
    fail "Django has unapplied migrations"
  fi
  echo "✓ Django migrations"

  if [[ "${REQUIRE_LOCAL_SNAPSHOT:-false}" == "true" || "${REQUIRE_LOCAL_SNAPSHOT:-0}" == "1" ]]; then
    compose exec -T postgres \
    psql -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" -Atqc \
      "SELECT EXISTS (SELECT 1 FROM content_items LIMIT 1);" \
    | grep -qx "t" \
    || fail "the local database has no content snapshot"
    echo "✓ local database contains restored content"
  else
    echo "✓ snapshot check skipped (use REQUIRE_LOCAL_SNAPSHOT=true when required)"
  fi

  assert_loopback_ports
  echo "✓ full local smoke passed"
}

cmd_doctor() {
  cmd_check
  [[ -f "$COMPOSE_ENV_FILE" ]] || prepare_compose_env
  echo
  cmd_status
  echo
  cmd_smoke_local
}

cmd_browser_local() {
  cmd_smoke_local
  mkdir -p "$ROOT_DIR/web/test-results/local-artifacts"
  compose --profile tools build browser
  compose --profile tools run --rm --no-deps browser
  echo "✓ local browser smoke passed; artifacts are under web/test-results/local-artifacts"
}

cmd_logs() {
  local service="${1:-}"
  check_prerequisites
  [[ -f "$COMPOSE_ENV_FILE" ]] || prepare_compose_env

  if [[ -n "$service" ]]; then
    case "$service" in
      web|core|proxy|postgres|redis) ;;
      *) fail "unknown service: $service" ;;
    esac
    exec docker compose \
      --env-file "$COMPOSE_ENV_FILE" \
      --file "$COMPOSE_FILE" \
      logs --follow --tail 100 "$service"
  fi

  compose logs --tail 30 postgres redis proxy core web
}

cmd_env_store() {
  guard_local_env
  mkdir -p "$ENV_STORE_DIR"
  chmod 700 "$ENV_STORE_DIR"
  install -m 600 "$ROOT_DIR/web/.env" "$ENV_STORE_DIR/web.env"
  install -m 600 "$ROOT_DIR/core/.env" "$ENV_STORE_DIR/core.env"
  install -m 600 "$ROOT_DIR/proxy/.env" "$ENV_STORE_DIR/proxy.env"
  echo "✓ private env files stored in $ENV_STORE_DIR"
  echo "  new worktree: make env-link"
}

link_env_file() {
  local stored="$1"
  local target="$2"

  [[ -f "$stored" ]] || fail "missing stored env: $stored"
  if [[ -e "$target" || -L "$target" ]]; then
    if [[ -L "$target" && "$(readlink "$target")" == "$stored" ]]; then
      return 0
    fi
    fail "${target#"$ROOT_DIR"/} already exists; refusing to overwrite it"
  fi
  ln -s "$stored" "$target"
}

validate_env_link() {
  local stored="$1"
  local target="$2"

  [[ -f "$stored" ]] || fail "missing stored env: $stored"
  if [[ -e "$target" || -L "$target" ]]; then
    [[ -L "$target" && "$(readlink "$target")" == "$stored" ]] \
      || fail "${target#"$ROOT_DIR"/} already exists; refusing to overwrite it"
  fi
}

cmd_env_link() {
  [[ -d "$ENV_STORE_DIR" ]] || fail \
    "private env store not found at $ENV_STORE_DIR; run 'make env-store' from the configured worktree first"
  validate_env_link "$ENV_STORE_DIR/web.env" "$ROOT_DIR/web/.env"
  validate_env_link "$ENV_STORE_DIR/core.env" "$ROOT_DIR/core/.env"
  validate_env_link "$ENV_STORE_DIR/proxy.env" "$ROOT_DIR/proxy/.env"
  link_env_file "$ENV_STORE_DIR/web.env" "$ROOT_DIR/web/.env"
  link_env_file "$ENV_STORE_DIR/core.env" "$ROOT_DIR/core/.env"
  link_env_file "$ENV_STORE_DIR/proxy.env" "$ROOT_DIR/proxy/.env"
  require_env_files
  guard_local_env
  echo "✓ this worktree now uses the private env store at $ENV_STORE_DIR"
}

postgres_service_running() {
  compose ps --status running --services postgres 2>/dev/null | grep -qx postgres
}

require_postgres_service() {
  postgres_service_running || fail \
    "postgres service for '$PROJECT_NAME' is not running; run 'make up'"
}

cmd_db_backup() {
  check_prerequisites
  prepare_compose_env
  require_postgres_service

  mkdir -p "$BACKUP_DIR"
  local timestamp file raw
  timestamp="$(date -u +%Y-%m-%dT%H_%M_%SZ)"
  file="$BACKUP_DIR/${PROJECT_NAME}-db-$timestamp.sql.gz"
  raw="$BACKUP_DIR/.${PROJECT_NAME}-db-$timestamp.dump"

  echo "→ dumping the local database in custom format"
  if ! compose exec -T postgres \
      pg_dump -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" \
      -Fc --no-owner --no-privileges >"$raw"; then
    rm -f "$raw"
    fail "pg_dump failed"
  fi

  if ! compose exec -T postgres pg_restore --list <"$raw" >/dev/null; then
    rm -f "$raw"
    fail "pg_restore rejected the local backup"
  fi

  gzip -c "$raw" >"$file"
  rm -f "$raw"
  chmod 600 "$file"
  echo "✓ wrote $file ($(du -h "$file" | cut -f1))"
}

cmd_db_backups() {
  if [[ ! -d "$BACKUP_DIR" ]]; then
    echo "(no local backups)"
    return 0
  fi

  shopt -s nullglob
  local files=("$BACKUP_DIR"/*.sql.gz)
  shopt -u nullglob
  if (( ${#files[@]} == 0 )); then
    echo "(no local backups)"
    return 0
  fi
  ls -1ht "${files[@]}"
}

cmd_db_restore() {
  local file="${1:-}"
  [[ -n "$file" ]] || fail "usage: make db-restore FILE=backups/file.sql.gz"
  [[ -f "$file" ]] || fail "file not found: $file"
  check_prerequisites
  prepare_compose_env
  require_postgres_service

  local temporary_dump="/tmp/denn-restore-$(date -u +%s).dump"
  echo "→ validating and restoring the local database"
  if ! gunzip -c "$file" \
      | compose exec -T postgres sh -c "cat > '$temporary_dump'"; then
    fail "failed to copy the backup into PostgreSQL"
  fi

  if ! compose exec -T postgres pg_restore --list "$temporary_dump" >/dev/null; then
    compose exec -T postgres rm -f "$temporary_dump" || true
    fail "the backup is not a valid custom-format PostgreSQL archive"
  fi

  compose stop core web >/dev/null

  compose exec -T postgres \
    psql -U "$LOCAL_DB_USER" -d postgres -v ON_ERROR_STOP=1 <<EOF
SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
 WHERE datname = '$LOCAL_DB_NAME' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS $LOCAL_DB_NAME;
CREATE DATABASE $LOCAL_DB_NAME OWNER $LOCAL_DB_USER;
EOF

  if ! compose exec -T postgres \
      pg_restore -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" \
      --no-owner --no-privileges --exit-on-error "$temporary_dump"; then
    compose exec -T postgres rm -f "$temporary_dump" || true
    fail "pg_restore failed"
  fi

  compose exec -T postgres rm -f "$temporary_dump"
  compose up --detach --wait --wait-timeout 120 core web
  echo "✓ local restore complete for $PROJECT_NAME; core and web restarted"
}

cmd_db_shell() {
  check_prerequisites
  prepare_compose_env
  require_postgres_service
  compose exec postgres \
    psql -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME"
}

cmd_test_core() {
  check_prerequisites
  prepare_compose_env
  require_postgres_service
  [[ -x "$ROOT_DIR/core/.venv/bin/python" ]] \
    || fail "core/.venv/bin/python is missing; install the Core development dependencies first"

  (
    cd "$ROOT_DIR/core"
    DATABASE_URL="postgresql://${LOCAL_DB_USER}:${LOCAL_DB_PASSWORD}@127.0.0.1:${POSTGRES_PORT}/${LOCAL_DB_NAME}" \
      AUTH_COOKIE_SECURE=True \
      .venv/bin/python manage.py test
  )
}

cmd_destroy() {
  check_prerequisites
  if [[ -f "$COMPOSE_ENV_FILE" ]]; then
    load_instance_from_compose_env
  else
    prepare_compose_env
  fi
  compose down --remove-orphans --volumes
  rm -f "$INSTANCE_STATE_FILE"
  echo "✓ local stack and its project-scoped volumes were destroyed for $PROJECT_NAME"
}

case "${1:-}" in
  check)           cmd_check ;;
  setup-local)     cmd_setup_local ;;
  up)              cmd_up ;;
  down)            cmd_down ;;
  destroy)         cmd_destroy ;;
  restart)         cmd_restart ;;
  restart-service) cmd_restart_service "${2:-}" ;;
  status)          cmd_status ;;
  doctor)          cmd_doctor ;;
  smoke-local)     cmd_smoke_local ;;
  browser-local)   cmd_browser_local ;;
  logs)            cmd_logs "${2:-}" ;;
  env-store)       cmd_env_store ;;
  env-link)        cmd_env_link ;;
  db-backup)       cmd_db_backup ;;
  db-backups)      cmd_db_backups ;;
  db-restore)      cmd_db_restore "${2:-}" ;;
  local-clone)     cmd_db_restore "${2:-}" ;;
  db-shell)        cmd_db_shell ;;
  test-core)       cmd_test_core ;;
  *)               usage; exit 1 ;;
esac
