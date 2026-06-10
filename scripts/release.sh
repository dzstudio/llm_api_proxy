#!/bin/bash
# =============================================
# 发布：推送代码到 Git（服务器拉取后自行构建）
# 服务器: 43.140.36.24 /var/data/llm_api_proxy
# =============================================
set -e

GREEN='\033[1;32m'
NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $1"; }

cd "$(dirname "$0")/.."

echo ""
echo "========================================"
echo "  LLM API Proxy - 发布"
echo "========================================"
echo ""

# 1. 提交本地改动
if ! git diff --quiet || ! git diff --cached --quiet; then
    info "发现未提交的改动，自动提交..."
    git add -A
    git commit -m "chore: auto commit before release"
fi

# 2. 推送
info "推送代码到 Git..."
git push

info "代码已推送。服务器执行："
echo ""
echo "  ssh root@43.140.36.24"
echo "  cd /var/data/llm_api_proxy"
echo "  git pull"
echo "  docker compose up -d --build"
echo ""
