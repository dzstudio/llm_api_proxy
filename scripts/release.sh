#!/bin/bash
# =============================================
# 一键发布：本地构建镜像 → 上传到服务器
# 服务器: 43.140.36.24 /var/data/llm_api_proxy
# =============================================
set -e

SERVER_HOST="43.140.36.24"
SERVER_USER="root"
SERVER_PATH="/var/data/llm_api_proxy"
SSH_KEY="/Users/zhangli/.ssh/id_rsa"
IMAGE_FILE="llm-api-proxy-image.tar.gz"

GREEN='\033[1;32m'
NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $1"; }

cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo ""
echo "========================================"
echo "  LLM API Proxy - 发布"
echo "  目标: ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}"
echo "========================================"
echo ""

# 1. 构建镜像 (linux/amd64)
info "1/3 构建 Docker 镜像 (linux/amd64)..."
export DOCKER_DEFAULT_PLATFORM=linux/amd64
docker compose build

# 2. 导出镜像
info "2/3 导出镜像..."
docker save llm_api_proxy-llm-api-proxy:latest | gzip > "${PROJECT_ROOT}/${IMAGE_FILE}"
info "压缩包: $(du -h "${PROJECT_ROOT}/${IMAGE_FILE}" | cut -f1)"

# 3. 上传到服务器
info "3/3 上传到服务器..."
scp -i "${SSH_KEY}" "${PROJECT_ROOT}/${IMAGE_FILE}" \
    ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

# 清理
rm -f "${PROJECT_ROOT}/${IMAGE_FILE}"
info "完成"
