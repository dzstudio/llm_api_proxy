#!/bin/bash
# =============================================
# 服务器端：拉取代码并构建启动
# 路径: /var/data/llm_api_proxy
# =============================================
set -e

GREEN='\033[1;32m'
NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $1"; }

cd /var/data/llm_api_proxy

echo "========================================"
echo "  LLM API Proxy - 部署"
echo "========================================"
echo ""

info "1/1 拉取代码并构建启动..."
git pull
docker compose up -d --build

echo ""
echo "========================================"
echo "  部署完成"
echo "========================================"
docker compose ps
