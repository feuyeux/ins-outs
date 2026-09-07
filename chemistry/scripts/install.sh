#!/usr/bin/env bash
# ==============================================================================
# Talbica Replica - 项目安装脚本 (Installation Script)
# ==============================================================================

set -e

# 颜色输出定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}  ⚛️  Talbica 周期表与化学数据库 - 安装配置向导${NC}"
echo -e "${CYAN}======================================================${NC}"
echo ""

# 1. 检查 Node.js 环境
echo -e "${BLUE}[1/3] 检查系统运行环境 (Node.js & npm)...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未检测到 Node.js。请先安装 Node.js (推荐 v18+ 或 v20+ LTS)。${NC}"
    echo -e "访问官网下载: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ Node.js 已安装: ${NODE_VERSION}${NC}"
echo -e "${GREEN}✓ npm 已安装: ${NPM_VERSION}${NC}"

# 2. 检查并安装项目依赖
echo ""
echo -e "${BLUE}[2/3] 安装项目依赖包 (vite, three, chroma-js, lucide)...${NC}"
npm install

# 3. 校验构建产物
echo ""
echo -e "${BLUE}[3/3] 验证构建与静态资源...${NC}"
npm run build

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}🎉 安装配置成功！工程已就绪！${NC}"
echo -e "${GREEN}======================================================${NC}"
echo ""
echo -e "你可以通过以下命令启动应用："
echo -e "  • 启动本地开发服务: ${YELLOW}npm run dev${NC} 或 ${YELLOW}./scripts/dev.sh${NC}"
echo -e "  • 构建生产静态资源: ${YELLOW}npm run build${NC} 或 ${YELLOW}./scripts/build.sh${NC}"
echo -e "  • Docker 部署预览:   ${YELLOW}./scripts/deploy.sh${NC}"
echo ""
