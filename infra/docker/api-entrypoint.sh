#!/bin/sh
set -eu

cd /app

API_DIR="/app/apps/api"
PRISMA_SCHEMA="$API_DIR/prisma/schema.prisma"
SEED_SCRIPT="$API_DIR/prisma/dist-seed/prisma/seed.js"
export NODE_ENV=production

build_database_url() {
  PG_USER="${SERVICE_USER_POSTGRES:-${POSTGRES_USER:-postgres}}"
  PG_PASS="${SERVICE_PASSWORD_POSTGRES:-${POSTGRES_PASSWORD:-}}"
  PG_DB="${POSTGRES_DB:-svnhub}"
  PG_HOST="${POSTGRES_HOST:-postgres}"
  PG_PORT="${POSTGRES_PORT:-5432}"

  if [ -z "$PG_PASS" ]; then
    echo "[api] ERROR: Postgres password is empty. Set SERVICE_PASSWORD_POSTGRES in Coolify." >&2
    exit 1
  fi

  ENCODED_PASS="$(node -e "console.log(encodeURIComponent(process.argv[1] || ''))" "$PG_PASS")"
  export DATABASE_URL="postgresql://${PG_USER}:${ENCODED_PASS}@${PG_HOST}:${PG_PORT}/${PG_DB}?schema=public"
  echo "[api] Database target: ${PG_USER}@${PG_HOST}:${PG_PORT}/${PG_DB}"
}

run_prisma() {
  if [ -x /app/node_modules/.bin/prisma ]; then
    /app/node_modules/.bin/prisma "$@"
    return
  fi

  if [ -x "$API_DIR/node_modules/.bin/prisma" ]; then
    "$API_DIR/node_modules/.bin/prisma" "$@"
    return
  fi

  echo "[api] ERROR: prisma CLI not found in node_modules/.bin" >&2
  exit 1
}

build_database_url

echo "[api] Running database migrations..."
if ! run_prisma migrate deploy --schema "$PRISMA_SCHEMA"; then
  echo "[api] ERROR: prisma migrate deploy failed." >&2
  exit 1
fi

if [ "${SKIP_DB_SEED:-false}" != "true" ]; then
  if [ ! -f "$SEED_SCRIPT" ]; then
    echo "[api] ERROR: compiled seed not found at $SEED_SCRIPT (rebuild API image)." >&2
    exit 1
  fi

  echo "[api] Running database seed..."
  if ! node "$SEED_SCRIPT"; then
    echo "[api] ERROR: database seed failed. Check SERVICE_PASSWORD_ADMIN on first deploy." >&2
    exit 1
  fi
else
  echo "[api] Skipping database seed (SKIP_DB_SEED=true)."
fi

echo "[api] Starting NestJS on ${HOST:-0.0.0.0}:${API_PORT:-4000}..."
exec node "$API_DIR/dist/main.js"
