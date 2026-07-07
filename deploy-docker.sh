#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_IMAGE="${BACKEND_IMAGE:-qqyzs-backend:latest}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-qqyzs-backend}"
NODE_IMAGE="${NODE_IMAGE:-node:20-alpine}"
NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmmirror.com}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err() { echo -e "${RED}✗${NC} $1"; }

ensure_dirs() {
    mkdir -p "$SCRIPT_DIR/backend/uploads" "$SCRIPT_DIR/logs"
}

build_backend() {
    info "构建后端 Docker 镜像: $BACKEND_IMAGE"
    DOCKER_BUILDKIT=1 docker build \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        -t "$BACKEND_IMAGE" \
        -f "$SCRIPT_DIR/backend/Dockerfile" \
        "$SCRIPT_DIR/backend"
}

build_frontend_dir() {
    local dir="$1"
    local label="$2"

    info "使用 Docker 构建 $label"
    docker run --rm \
        -e npm_config_registry="$NPM_REGISTRY" \
        -v "$SCRIPT_DIR:/workspace" \
        -w "/workspace/$dir" \
        "$NODE_IMAGE" \
        sh -lc 'if [ -f package-lock.json ]; then npm ci --prefer-offline --no-audit --fund=false; else npm install --package-lock=false --prefer-offline --no-audit --fund=false; fi && npm run build'
}

build_admin() {
    build_frontend_dir "admin" "管理后台"
    build_frontend_dir "SL-admin" "算力监控后台"
}

stop_legacy_backend() {
    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q "^ld-ai.service"; then
        if systemctl is-active --quiet ld-ai; then
            warn "停止旧 systemd 后端服务 ld-ai"
            systemctl stop ld-ai || true
        fi
        if [ "${DISABLE_LEGACY_SERVICE:-true}" = "true" ]; then
            if systemctl is-enabled --quiet ld-ai 2>/dev/null; then
                warn "禁用旧 systemd 后端服务开机自启，避免和 Docker 容器抢占 8080"
                systemctl disable ld-ai || true
            fi
        fi
    fi

    if docker ps -a --format '{{.Names}}' | grep -qx "$BACKEND_CONTAINER"; then
        return
    fi

    local pids
    pids="$(pgrep -f 'app.jar|backend.*\.jar' || true)"
    if [ -n "$pids" ]; then
        warn "停止旧 Java 后端进程: $pids"
        kill $pids 2>/dev/null || true
        sleep 2
        pids="$(pgrep -f 'app.jar|backend.*\.jar' || true)"
        if [ -n "$pids" ]; then
            kill -9 $pids 2>/dev/null || true
        fi
    fi
}

start_backend() {
    ensure_dirs
    stop_legacy_backend

    if docker ps -a --format '{{.Names}}' | grep -qx "$BACKEND_CONTAINER"; then
        warn "替换旧后端容器 $BACKEND_CONTAINER"
        docker rm -f "$BACKEND_CONTAINER" >/dev/null
    fi

    info "启动后端容器 $BACKEND_CONTAINER"
    docker run -d \
        --name "$BACKEND_CONTAINER" \
        --restart unless-stopped \
        --network host \
        -e TZ=Asia/Shanghai \
        -e SERVER_PORT="${SERVER_PORT:-8080}" \
        -e JAVA_OPTS="${JAVA_OPTS:-}" \
        -e SPRING_DATASOURCE_URL="${SPRING_DATASOURCE_URL:-jdbc:mysql://127.0.0.1:3307/juxinsuanli?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&useSSL=false}" \
        -e SPRING_DATASOURCE_USERNAME="${SPRING_DATASOURCE_USERNAME:-juxinsuanli}" \
        -e SPRING_DATASOURCE_PASSWORD="${SPRING_DATASOURCE_PASSWORD:-juxinsuanli}" \
        -e SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE="${SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE:-80}" \
        -e SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE="${SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE:-10}" \
        -e SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT="${SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT:-10000}" \
        -e SPRING_DATASOURCE_HIKARI_LEAK_DETECTION_THRESHOLD="${SPRING_DATASOURCE_HIKARI_LEAK_DETECTION_THRESHOLD:-20000}" \
        -e IP2REGION_XDB_PATH=/app/ip2region.xdb \
        -e CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:-https://hz.shandongliandong.com,https://juxinsuanli.cn,https://www.juxinsuanli.cn,https://ld.juxinsuanli.cn,https://api.juxinsuanli.cn}" \
        -v "$SCRIPT_DIR/backend/uploads:/app/uploads" \
        -v "$SCRIPT_DIR/device_agent:/device_agent:ro" \
        "$BACKEND_IMAGE" >/dev/null
}

wait_backend() {
    info "等待后端健康检查"
    for _ in $(seq 1 40); do
        if curl -fsS "http://127.0.0.1:${SERVER_PORT:-8080}/api/settings/banners" >/dev/null 2>&1; then
            info "后端已就绪"
            return 0
        fi
        sleep 2
    done

    err "后端启动后未通过健康检查"
    docker logs --tail 120 "$BACKEND_CONTAINER" || true
    return 1
}

deploy() {
    ensure_dirs
    build_backend
    build_admin
    start_backend
    wait_backend
    info "Docker 部署完成"
}

status() {
    docker ps --filter "name=$BACKEND_CONTAINER" --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
    curl -fsS "http://127.0.0.1:${SERVER_PORT:-8080}/api/settings/banners" >/dev/null \
        && info "API 本机健康检查通过" \
        || warn "API 本机健康检查失败"
}

logs() {
    docker logs -f --tail 200 "$BACKEND_CONTAINER"
}

stop() {
    docker rm -f "$BACKEND_CONTAINER" >/dev/null 2>&1 || true
    info "后端容器已停止"
}

case "${1:-help}" in
    deploy)
        deploy
        ;;
    build)
        ensure_dirs
        build_backend
        build_admin
        ;;
    build-backend)
        ensure_dirs
        build_backend
        ;;
    build-admin)
        ensure_dirs
        build_admin
        ;;
    start)
        start_backend
        wait_backend
        ;;
    restart)
        start_backend
        wait_backend
        ;;
    stop)
        stop
        ;;
    status)
        status
        ;;
    logs|log)
        logs
        ;;
    *)
        cat <<'USAGE'
全球云智算（LD-HEZI）Docker 部署脚本

用法:
  ./deploy-docker.sh deploy         构建后端镜像和前端 dist，成功后切换后端容器
  ./deploy-docker.sh build          只构建，不启动
  ./deploy-docker.sh build-backend  只构建后端镜像
  ./deploy-docker.sh build-admin    只构建两个后台前端
  ./deploy-docker.sh start          启动后端容器
  ./deploy-docker.sh restart        重建后端容器
  ./deploy-docker.sh stop           停止后端容器
  ./deploy-docker.sh status         查看状态
  ./deploy-docker.sh logs           查看后端日志

说明:
  - MySQL 继续使用现有 127.0.0.1:3307，不会动数据库容器。
  - 宿主机 Nginx 继续使用现有配置，前端仍输出到 admin/dist 和 SL-admin/dist。
  - 第一次 deploy 会在构建成功后停止旧 ld-ai/app.jar，再启动 Docker 后端。
  - 默认会禁用旧 ld-ai.service 开机自启；如需保留，执行前设置 DISABLE_LEGACY_SERVICE=false。
USAGE
        ;;
esac
