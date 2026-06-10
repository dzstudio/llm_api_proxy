#!/bin/bash
# =============================================
# 服务器端部署脚本（在服务器上执行）
# 拉取代码 → 加载镜像 → 启动容器
# =============================================
set -e

GREEN='\033[1;32m'
NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $1"; }

cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
IMAGE_FILE="${PROJECT_ROOT}/llm-api-proxy-image.tar.gz"

echo "========================================"
echo "  LLM API Proxy - 服务器部署"
echo "========================================"
echo ""

# 1. 拉取代码
info "1/3 git pull..."
git pull

# 2. 加载镜像
if [ -f "${IMAGE_FILE}" ]; then
    info "2/3 docker load..."
    docker load -i "${IMAGE_FILE}"
else
    echo "警告: 未找到 ${IMAGE_FILE}，跳过加载镜像"
fi

# 3. 启动
info "3/3 docker compose up..."
docker compose up -d

# 清理
rm -f "${IMAGE_FILE}"

echo ""
echo "========================================"
echo "  部署完成"
echo "========================================"
docker compose ps
