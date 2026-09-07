# ==============================================================================
# Multi-Stage Build Dockerfile for Talbica Replica
# Stage 1: Build
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖配置并安装
COPY package*.json ./
RUN npm install

# 复制源代码并执行构建
COPY . .
RUN npm run build

# ==============================================================================
# Stage 2: Production Nginx Server
# ==============================================================================
FROM nginx:alpine

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物到 Nginx 默认静态目录
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
