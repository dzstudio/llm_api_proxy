#!/bin/sh
set -e

echo "[Entrypoint] Running database migrations..."
cd /app/backend
npx prisma migrate deploy

echo "[Entrypoint] Starting application..."
exec node dist/index.js
