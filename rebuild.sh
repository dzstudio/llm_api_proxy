#!/bin/bash
# 服务器端快速重建脚本
#
# ── 初次部署 ──
#   1. git clone <repo> && cd <project>
#   2. chmod +x rebuild.sh
#   3. ./rebuild.sh             # 先编译（生成 dist 到宿主机目录）
#   4. docker compose up -d --build  # 启动（dist 已存在，通过 volume 挂载）
#
# ── 后续更新代码 ──
#   git pull && ./rebuild.sh    # 拉取 → 编译 → 重启，无需 --build
#
# named volume 会缓存 node_modules，后续编译只需几秒
set -e

echo "=== 拉取最新代码 ==="
git pull

echo ""
echo "=== 编译前端 ==="
docker run --rm \
  -v "$(pwd)/frontend":/build \
  -w /build \
  -v llm-api-proxy-frontend-node-modules:/build/node_modules \
  node:22-alpine \
  sh -c "npm install && npm run build"

echo ""
echo "=== 编译后端 ==="
docker run --rm \
  -v "$(pwd)/backend":/build \
  -w /build \
  -v llm-api-proxy-backend-node-modules:/build/node_modules \
  node:22-alpine \
  sh -c "npm install && npx prisma generate && npm run build"

echo ""
echo "=== 重启应用容器 ==="
docker compose restart

echo ""
echo "=== 完成 ==="
docker compose logs --tail=10
