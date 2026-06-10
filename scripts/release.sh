#!/bin/bash
# =============================================
# 一键发布脚本（本地执行）
# 本地构建镜像 → 通过 rsync 上传到服务器
# 服务器上会自动加载镜像并启动容器
# =============================================
set -e

# ---------- 配置 ----------
SERVER_HOST="${DEPLOY_HOST:-172.16.0.14}"
SERVER_USER="${DEPLOY_USER:-root}"
SERVER_PATH="${DEPLOY_PATH:-/opt/llm_api_proxy}"
IMAGE_FILE="llm-api-proxy-image.tar.gz"

# ---------- 颜色输出 ----------
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo ""
echo "========================================"
echo "  LLM API Proxy - 一键发布"
echo "  目标: ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}"
echo "========================================"
echo ""

# ---------- 1. 构建镜像（linux/amd64，兼容服务器 x86_64） ----------
info "1/4 构建 Docker 镜像 (linux/amd64)..."
export DOCKER_DEFAULT_PLATFORM=linux/amd64
docker compose build || error "构建失败"

# ---------- 2. 导出镜像 ----------
info "2/4 导出镜像为 ${IMAGE_FILE}..."
docker save llm_api_proxy-llm-api-proxy:latest | gzip > "${PROJECT_ROOT}/${IMAGE_FILE}"
IMAGE_SIZE=$(du -h "${PROJECT_ROOT}/${IMAGE_FILE}" | cut -f1)
info "镜像压缩包: ${IMAGE_SIZE}"

# ---------- 3. 推送代码 ----------
info "3/4 推送代码到 Git..."
git push || warn "Git 推送失败，继续上传镜像"

# ---------- 4. 上传镜像 + 远程部署 ----------
info "4/4 上传镜像到服务器并启动..."

# 确保服务器目录存在
ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${SERVER_PATH}" || error "无法连接服务器"

# 上传镜像
scp "${PROJECT_ROOT}/${IMAGE_FILE}" ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/ || error "上传失败"

# 服务器端：拉取代码、加载镜像、启动
ssh ${SERVER_USER}@${SERVER_HOST} "bash -s" << ENDSSH
set -e
cd ${SERVER_PATH}

echo ">>> git pull..."
git pull

echo ">>> docker load..."
docker load -i ${IMAGE_FILE}

echo ">>> docker compose up..."
docker compose up -d

echo ">>> 清理压缩包..."
rm -f ${IMAGE_FILE}

echo ">>> 部署完成"
ENDSSH

# ---------- 5. 清理本地压缩包 ----------
info "清理本地临时文件..."
rm -f "${PROJECT_ROOT}/${IMAGE_FILE}"

echo ""
echo "========================================"
echo "  发布完成"
echo "  Web: http://${SERVER_HOST}:8088"
echo "========================================"
