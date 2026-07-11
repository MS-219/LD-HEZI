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

run_migrations() {
    local mysql_container="${MYSQL_CONTAINER:-qqyzs-mysql}"
    local migration="$SCRIPT_DIR/backend/sql/add_app_account_and_version.sql"
    if ! docker ps --format '{{.Names}}' | grep -qx "$mysql_container"; then
        err "MySQL 容器未运行: $mysql_container"
        return 1
    fi
    info "执行数据库迁移: $(basename "$migration")"
    docker exec -i "$mysql_container" sh -c '
        exec mysql \
          -u"${MYSQL_USER:-root}" \
          -p"${MYSQL_PASSWORD:-${MYSQL_ROOT_PASSWORD}}" \
          "${MYSQL_DATABASE:-ldhezi}"
    ' < "$migration"
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

start_backend() {
    ensure_dirs

    # 优先读取服务器项目目录下的 .env；已 export 的同名变量会覆盖 .env。
    local env_args=()
    if [[ -f "$SCRIPT_DIR/.env" ]]; then
        env_args+=(--env-file "$SCRIPT_DIR/.env")
    fi
    local env_name
    for env_name in ALIBABA_CLOUD_ACCESS_KEY_ID ALIBABA_CLOUD_ACCESS_KEY_SECRET ALIYUN_SMS_SIGN_NAME ALIYUN_SMS_TEMPLATE_CODE; do
        if [[ -n "${!env_name:-}" ]]; then
            env_args+=(-e "$env_name=${!env_name}")
        fi
    done

    if docker ps -a --format '{{.Names}}' | grep -qx "$BACKEND_CONTAINER"; then
        warn "替换旧后端容器 $BACKEND_CONTAINER"
        docker rm -f "$BACKEND_CONTAINER" >/dev/null
    fi

    info "启动后端容器 $BACKEND_CONTAINER"
    docker run -d \
        --name "$BACKEND_CONTAINER" \
        --restart unless-stopped \
        --network host \
        "${env_args[@]}" \
        -e TZ=Asia/Shanghai \
        -e SERVER_PORT="${SERVER_PORT:-8080}" \
        -e JAVA_OPTS="${JAVA_OPTS:-}" \
        -e SPRING_DATASOURCE_URL="${SPRING_DATASOURCE_URL:-jdbc:mysql://127.0.0.1:3307/ldhezi?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&useSSL=false}" \
        -e SPRING_DATASOURCE_USERNAME="${SPRING_DATASOURCE_USERNAME:-ldhezi}" \
        -e SPRING_DATASOURCE_PASSWORD="${SPRING_DATASOURCE_PASSWORD:-ldhezi}" \
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
    run_migrations
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
    migrate)
        run_migrations
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
  ./deploy-docker.sh migrate        执行账号与 App 版本数据库迁移
  ./deploy-docker.sh start          启动后端容器
  ./deploy-docker.sh restart        重建后端容器
  ./deploy-docker.sh stop           停止后端容器
  ./deploy-docker.sh status         查看状态
  ./deploy-docker.sh logs           查看后端日志

说明:
  - MySQL 使用 qqyzs-mysql 容器（127.0.0.1:3307，库 ldhezi）。
  - 端口默认 8080，共享服务器上用 SERVER_PORT=8090 ./deploy-docker.sh deploy 指定。
  - 本脚本只操作 qqyzs-backend 容器，不影响宿主机上其他项目的容器。
USAGE
        ;;
esac
