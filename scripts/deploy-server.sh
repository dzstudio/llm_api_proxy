#!/bin/bash
# =============================================
# 服务器端：加载镜像并启动容器
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

info "1/3 加载镜像..."
docker load -i llm-api-proxy-image.tar.gz

info "2/3 启动容器..."
docker compose up -d

info "3/3 清理压缩包..."
rm -f llm-api-proxy-image.tar.gz

echo ""
echo "========================================"
echo "  部署完成"
echo "========================================"
docker compose ps
