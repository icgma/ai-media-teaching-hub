#!/bin/bash
set -e

# ==========================================
#  AI Media Teaching Hub — Deploy Script
# ==========================================

COMPOSE_FILE="docker-compose.prod.yml"
EXTERNAL_PORT=8505

echo ""
echo "🚀 AI Media Teaching Hub 部署开始..."
echo "=========================================="
echo ""

# 1. Pull latest code (skip if not a git repo)
if [ -d ".git" ]; then
    echo "📥 拉取最新代码..."
    git pull || echo "⚠️  Git pull 失败，使用本地代码继续..."
fi

# 2. Stop old containers (if any)
echo "🛑 停止旧容器..."
docker compose -f $COMPOSE_FILE down --remove-orphans 2>/dev/null || true

# 3. Build and start containers
echo "🏗️  构建并启动容器..."
docker compose -f $COMPOSE_FILE up -d --build

# 4. Wait for services to start
echo "⏳ 等待服务启动..."
sleep 15

# 5. Health Check
echo "🔍 运行健康检查..."

# Check if containers are running
RUNNING=$(docker compose -f $COMPOSE_FILE ps --format '{{.State}}' | grep -c "running" || true)
TOTAL=$(docker compose -f $COMPOSE_FILE ps --format '{{.State}}' | wc -l || true)

if [ "$RUNNING" -ge 3 ]; then
    echo "✅ 所有 $RUNNING/$TOTAL 个容器正在运行"
else
    echo "⚠️  仅 $RUNNING/$TOTAL 个容器在运行，查看日志:"
    docker compose -f $COMPOSE_FILE logs --tail=20
fi

# Check backend API health
if curl -sf http://localhost:$EXTERNAL_PORT/api/health > /dev/null 2>&1; then
    echo "✅ 后端 API 健康检查通过"
else
    echo "⚠️  后端 API 暂未响应（可能还在启动中，稍后可手动检查）"
fi

# Get server IP
SERVER_IP=$(curl -sf ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo "=========================================="
echo "  ✅ 部署完成！"
echo ""
echo "  访问地址: http://${SERVER_IP}:${EXTERNAL_PORT}"
echo "  容器状态: $(docker compose -f $COMPOSE_FILE ps --format '{{.Name}}: {{.State}}' | tr '\n' ', ')"
echo "=========================================="
echo ""
echo "常用命令:"
echo "  查看日志:  docker compose -f $COMPOSE_FILE logs -f --tail=50"
echo "  重启服务:  docker compose -f $COMPOSE_FILE restart"
echo "  停止服务:  docker compose -f $COMPOSE_FILE down"
echo ""
