#!/bin/sh
set -e

echo "[Entrypoint] Running database migrations..."
cd /app/backend
npx prisma migrate deploy --schema=prisma/schema.prisma
echo "[Entrypoint] Migrations complete. Starting application..."

exec node dist/index.js
