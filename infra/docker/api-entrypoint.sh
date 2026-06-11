#!/bin/sh
set -eu

cd /app

echo "[api] Running database migrations..."
pnpm --filter @svnhub/api db:migrate

echo "[api] Running database seed..."
pnpm --filter @svnhub/api db:seed

echo "[api] Starting NestJS..."
exec pnpm --filter @svnhub/api start
