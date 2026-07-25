#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.workspace"
COMPOSE_FILE="$ROOT_DIR/compose.local.yml"
COMPOSE_ENV_FILE="$STATE_DIR/compose.env"
ENV_STORE_DIR="${DENN_LOCAL_ENV_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/denn/local}"

PG_CONTAINER="${PG_CONTAINER:-denn-pg}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"

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
  ./.scripts/workspace.sh db-shell

Environment store:
  DENN_LOCAL_ENV_DIR defaults to ~/.config/denn/local.
  It contains private web.env, core.env and proxy.env files shared by symlink.
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
  local port="$3"
  local path="$4"
  local optional="${5:-false}"
  local value
  value="$(read_env_value "$file" "$key")"

  if [[ -z "$value" && "$optional" == "true" ]]; then
    return 0
  fi

  [[ "$value" =~ ^http://(127\.0\.0\.1|localhost):${port}${path}/?$ ]] \
    || fail "$key in ${file#"$ROOT_DIR"/} must point to the local service on port $port"
}

parse_local_database_url() {
  local database_url
  database_url="$(read_env_value "$ROOT_DIR/core/.env" "DATABASE_URL")"

  if [[ "$database_url" =~ ^postgres(ql)?://([^:]+):([^@]+)@(127\.0\.0\.1|localhost):5432/([^?]+)(\?.*)?$ ]]; then
    LOCAL_DB_USER="${BASH_REMATCH[2]}"
    LOCAL_DB_PASSWORD="${BASH_REMATCH[3]}"
    LOCAL_DB_NAME="${BASH_REMATCH[5]}"
  else
    fail "DATABASE_URL in core/.env must point to local PostgreSQL on port 5432"
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

  assert_local_http_url "$ROOT_DIR/web/.env" "API_URL" "8000" "/api"
  assert_local_http_url "$ROOT_DIR/web/.env" "PROXY_API_URL" "8080" "/v1/proxy"
  assert_local_http_url "$ROOT_DIR/web/.env" "NEXT_PUBLIC_API_URL" "8000" "/api" true
  assert_local_http_url "$ROOT_DIR/web/.env" "NEXT_PUBLIC_PROXY_API_URL" "8080" "/v1/proxy" true
  assert_local_http_url "$ROOT_DIR/core/.env" "PROXY_API_BASE_URL" "8080" "/v1/proxy"
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
  mkdir -p "$STATE_DIR"
  chmod 700 "$STATE_DIR"

  local temporary_file
  local web_lock_checksum
  web_lock_checksum="$(cksum "$ROOT_DIR/web/pnpm-lock.yaml" | awk '{ print $1 }')"
  temporary_file="$(mktemp "$STATE_DIR/compose.env.XXXXXX")"
  chmod 600 "$temporary_file"
  {
    printf 'COMPOSE_PROJECT_NAME=denn-local\n'
    printf 'LOCAL_DB_USER=%s\n' "$LOCAL_DB_USER"
    printf 'LOCAL_DB_PASSWORD=%s\n' "$LOCAL_DB_PASSWORD"
    printf 'LOCAL_DB_NAME=%s\n' "$LOCAL_DB_NAME"
    printf 'WEB_DEPS_VOLUME=denn-web-node-modules-%s\n' "$web_lock_checksum"
  } >"$temporary_file"
  mv "$temporary_file" "$COMPOSE_ENV_FILE"
  chmod 600 "$COMPOSE_ENV_FILE"
}

compose() {
  docker compose \
    --env-file "$COMPOSE_ENV_FILE" \
    --file "$COMPOSE_FILE" \
    "$@"
}

check_prerequisites() {
  require_cmd docker
  require_cmd curl
  require_cmd gzip
  require_cmd gunzip
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

container_exists() {
  docker inspect "$1" >/dev/null 2>&1
}

adopt_local_postgres_volume() {
  if ! container_exists "$PG_CONTAINER"; then
    return 0
  fi

  local project volume
  project="$(
    docker inspect \
      --format '{{ index .Config.Labels "com.docker.compose.project" }}' \
      "$PG_CONTAINER" 2>/dev/null || true
  )"
  [[ "$project" == "denn-local" ]] && return 0

  volume="$(
    docker inspect \
      --format '{{ range .Mounts }}{{ if eq .Destination "/var/lib/postgresql" }}{{ .Name }}{{ end }}{{ end }}' \
      "$PG_CONTAINER"
  )"
  [[ "$volume" == "denn-pg-data" ]] || fail \
    "container $PG_CONTAINER is not managed by Denn Compose and does not use denn-pg-data; refusing to replace it"

  echo "→ adopting existing $PG_CONTAINER container; volume denn-pg-data is preserved"
  if [[ "$(docker inspect --format '{{ .State.Running }}' "$PG_CONTAINER")" == "true" ]]; then
    docker stop --time 30 "$PG_CONTAINER" >/dev/null
  fi
  docker rm "$PG_CONTAINER" >/dev/null
}

remove_legacy_redis() {
  local legacy_container="denn-workspace-redis"
  if container_exists "$legacy_container"; then
    echo "→ removing legacy temporary Redis container"
    docker rm --force "$legacy_container" >/dev/null
  fi
}

cmd_setup_local() {
  check_prerequisites
  prepare_compose_env
  adopt_local_postgres_volume
  remove_legacy_redis

  if ! docker volume inspect denn-pg-data >/dev/null 2>&1; then
    docker volume create denn-pg-data >/dev/null
    echo "✓ created persistent volume denn-pg-data"
  fi

  compose pull postgres redis
  compose build proxy core web
  echo "✓ local images and persistent database volume are ready"
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
  echo "✓ local app: http://127.0.0.1:3000"
}

cmd_down() {
  check_prerequisites
  [[ -f "$COMPOSE_ENV_FILE" ]] || prepare_compose_env
  compose down --remove-orphans
  echo "✓ local stack stopped; database volume denn-pg-data was preserved"
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
  local container binding
  for container in \
    denn-pg \
    denn-local-redis \
    denn-local-proxy \
    denn-local-core \
    denn-local-web; do
    container_exists "$container" || fail "expected container is missing: $container"
    while IFS= read -r binding; do
      [[ -z "$binding" || "$binding" == "127.0.0.1" ]] \
        || fail "$container publishes a port outside loopback: $binding"
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

  http_check "proxy health" "http://127.0.0.1:8080/v1/proxy/health"
  http_check "core health" "http://127.0.0.1:8000/api/"
  http_check "web" "http://127.0.0.1:3000/"

  local proxy_key
  proxy_key="$(read_env_value "$ROOT_DIR/proxy/.env" "API_KEY")"
  printf 'header = "X-Api-Key: %s"\nheader = "X-Api-Consumer: local-smoke"\n' "$proxy_key" \
    | curl \
      --config - \
      --fail \
      --silent \
      --show-error \
      --max-time 20 \
      "http://127.0.0.1:8080/v1/proxy/homepage?limit=1" \
      >/dev/null \
    || fail "authenticated local proxy request failed"
  echo "✓ authenticated proxy request"

  if docker exec denn-local-core \
      python manage.py showmigrations --plan 2>/dev/null \
      | grep -q '\[ \]'; then
    fail "Django has unapplied migrations"
  fi
  echo "✓ Django migrations"

  docker exec "$PG_CONTAINER" \
    psql -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" -Atqc \
      "SELECT EXISTS (SELECT 1 FROM content_items LIMIT 1);" \
    | grep -qx "t" \
    || fail "the local database has no content snapshot"
  echo "✓ local database contains restored content"

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

pg_container_running() {
  docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"
}

require_pg_container() {
  pg_container_running || fail \
    "postgres container '$PG_CONTAINER' is not running; run 'make up'"
}

cmd_db_backup() {
  check_prerequisites
  prepare_compose_env
  require_pg_container

  mkdir -p "$BACKUP_DIR"
  local timestamp file raw
  timestamp="$(date -u +%Y-%m-%dT%H_%M_%SZ)"
  file="$BACKUP_DIR/denn-db-$timestamp.sql.gz"
  raw="$BACKUP_DIR/.denn-db-$timestamp.dump"

  echo "→ dumping the local database in custom format"
  if ! docker exec "$PG_CONTAINER" \
      pg_dump -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" \
      -Fc --no-owner --no-privileges >"$raw"; then
    rm -f "$raw"
    fail "pg_dump failed"
  fi

  if ! docker exec -i "$PG_CONTAINER" pg_restore --list <"$raw" >/dev/null; then
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
  require_pg_container

  compose stop core web >/dev/null

  local temporary_dump="/tmp/denn-restore-$(date -u +%s).dump"
  echo "→ validating and restoring the local database"
  if ! gunzip -c "$file" \
      | docker exec -i "$PG_CONTAINER" sh -c "cat > '$temporary_dump'"; then
    fail "failed to copy the backup into PostgreSQL"
  fi

  if ! docker exec "$PG_CONTAINER" pg_restore --list "$temporary_dump" >/dev/null; then
    docker exec "$PG_CONTAINER" rm -f "$temporary_dump" || true
    fail "the backup is not a valid custom-format PostgreSQL archive"
  fi

  docker exec -i "$PG_CONTAINER" \
    psql -U "$LOCAL_DB_USER" -d postgres -v ON_ERROR_STOP=1 <<EOF
SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
 WHERE datname = '$LOCAL_DB_NAME' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS $LOCAL_DB_NAME;
CREATE DATABASE $LOCAL_DB_NAME OWNER $LOCAL_DB_USER;
EOF

  if ! docker exec "$PG_CONTAINER" \
      pg_restore -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" \
      --no-owner --no-privileges --exit-on-error "$temporary_dump"; then
    docker exec "$PG_CONTAINER" rm -f "$temporary_dump" || true
    fail "pg_restore failed"
  fi

  docker exec "$PG_CONTAINER" rm -f "$temporary_dump"
  compose up --detach --wait --wait-timeout 120 core web
  echo "✓ local restore complete; core and web restarted"
}

cmd_db_shell() {
  check_prerequisites
  prepare_compose_env
  require_pg_container
  exec docker exec -it "$PG_CONTAINER" \
    psql -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME"
}

case "${1:-}" in
  check)           cmd_check ;;
  setup-local)     cmd_setup_local ;;
  up)              cmd_up ;;
  down)            cmd_down ;;
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
  db-shell)        cmd_db_shell ;;
  *)               usage; exit 1 ;;
esac
