#!/usr/bin/env bash
# ==============================================================================
# Talbica Replica - 生产环境部署脚本 (Deployment Script)
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}  🚀 Talbica 一键生产部署向导${NC}"
echo -e "${CYAN}======================================================${NC}"
echo ""

MODE="${1:-preview}"

case "$MODE" in
    docker)
        echo -e "${BLUE}▶ 方式 1: 使用 Docker 与 Docker Compose 构建容器化镜像...${NC}"
        if ! command -v docker &> /dev/null; then
            echo "❌ 未安装 Docker，请先安装 Docker: https://www.docker.com/"
            exit 1
        fi
        docker compose down || true
        docker compose up -d --build
        echo -e "${GREEN}✓ Docker 容器启动成功！访问地址: http://localhost:8080${NC}"
        ;;
    build)
        echo -e "${BLUE}▶ 方式 2: 构建纯静态生产产物...${NC}"
        npm run build
        echo -e "${GREEN}✓ 纯静态资源已输出至 dist/ 目录，可直接上传到 CDN、Nginx、Vercel 或 GitHub Pages。${NC}"
        ;;
    preview|*)
        echo -e "${BLUE}▶ 方式 3: 编译生产产物并在本地预览服务器中运行...${NC}"
        npm run build
        echo -e "${GREEN}✓ 编译完毕，正在启动本地生产级别静态预览服务 (端口 4173)...${NC}"
        npx vite preview --host 0.0.0.0 --port 4173
        ;;
esac
