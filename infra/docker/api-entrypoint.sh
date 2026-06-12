#!/bin/sh
set -eu

cd /app

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

build_database_url

echo "[api] Running database migrations..."
if ! pnpm --filter @svnhub/api db:migrate; then
  echo "[api] ERROR: prisma migrate deploy failed." >&2
  exit 1
fi

if [ "${SKIP_DB_SEED:-false}" != "true" ]; then
  echo "[api] Running database seed..."
  if ! pnpm --filter @svnhub/api db:seed; then
    echo "[api] ERROR: database seed failed. Check SERVICE_PASSWORD_ADMIN / ADMIN_INITIAL_PASSWORD." >&2
    exit 1
  fi
else
  echo "[api] Skipping database seed (SKIP_DB_SEED=true)."
fi

echo "[api] Starting NestJS..."
exec pnpm --filter @svnhub/api start
