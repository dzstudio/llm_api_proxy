#!/bin/sh
set -e

echo "[Entrypoint] Starting application..."
cd /app/backend
exec node dist/index.js
