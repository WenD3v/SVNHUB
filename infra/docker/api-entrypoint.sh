#!/bin/sh
set -eu

cd /app

export NODE_ENV=production

build_database_url() {
  PG_USER="${SERVICE_USER_POSTGRES:-${POSTGRES_USER:-postgres}}"
  PG_PASS="${SERVICE_PASSWORD_POSTGRES:-${POSTGRES_PASSWORD:-}}"
  PG_DB="${POSTGRES_DB:-svnhub}"
  PG_HOST="${POSTGRES_HOST:-postgres}"
  PG_PORT="${POSTGRES_PORT:-5432}"

  if [ -n "${DATABASE_URL:-}" ] && [ -z "${SERVICE_PASSWORD_POSTGRES:-}" ]; then
    echo "[api] Using DATABASE_URL from environment."
    return 0
  fi

  if [ -z "$PG_PASS" ]; then
    echo "[api] ERROR: Postgres password is empty. Set SERVICE_PASSWORD_POSTGRES in Coolify." >&2
    exit 1
  fi

  ENCODED_PASS="$(node -e "console.log(encodeURIComponent(process.argv[1] || ''))" "$PG_PASS")"
  export DATABASE_URL="postgresql://${PG_USER}:${ENCODED_PASS}@${PG_HOST}:${PG_PORT}/${PG_DB}?schema=public"
  echo "[api] Database target: ${PG_USER}@${PG_HOST}:${PG_PORT}/${PG_DB}"
}

build_database_url

echo "[api] Running database migrations..."
pnpm --filter @svnhub/api db:migrate

echo "[api] Running database seed..."
pnpm --filter @svnhub/api db:seed

echo "[api] Starting NestJS on ${HOST:-0.0.0.0}:${API_PORT:-4000}..."
exec pnpm --filter @svnhub/api start
