#!/bin/sh
set -e

echo "[Entrypoint] Syncing database schema..."
cd /app/backend
npx prisma db push --schema=prisma/schema.prisma
echo "[Entrypoint] Schema sync complete. Starting application..."

exec node dist/index.js
