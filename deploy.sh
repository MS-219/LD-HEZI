#!/bin/bash

# 聚芯算力 Linux 部署脚本
# 域名: juxinsuanli.cn
# 服务器: 123.57.226.180
# 使用方法: ./deploy.sh [命令]
# 命令: start / stop / restart / log / status / install

# 目录配置
SCRIPT_DIR=$(pwd)
BACKEND_DIR="$SCRIPT_DIR/backend"
ADMIN_DIR="$SCRIPT_DIR/admin"
SL_ADMIN_DIR="$SCRIPT_DIR/SL-admin"
NGINX_DIR="$SCRIPT_DIR/deploy"
LOG_DIR="$SCRIPT_DIR/logs"

# 确保日志目录存在
mkdir -p "$LOG_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() { echo -e "${GREEN}✓${NC} $1"; }
print_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

# 检查并安装依赖 (CentOS/RHEL)
install_deps() {
    echo "🔧 安装依赖..."
    
    # 检查 Java
    if ! command -v java &> /dev/null; then
        print_warn "安装 Java 11..."
        sudo yum install -y java-11-openjdk java-11-openjdk-devel
    else
        print_info "Java 已安装: $(java -version 2>&1 | head -1)"
    fi
    
    # 检查 Maven
    if ! command -v mvn &> /dev/null; then
        print_warn "安装 Maven..."
        sudo yum install -y maven
    else
        print_info "Maven 已安装: $(mvn -v | head -1)"
    fi
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        print_warn "安装 Node.js..."
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    else
        print_info "Node.js 已安装: $(node -v)"
    fi
    
    print_info "依赖安装完成"
}

# 构建后端
build_backend() {
    echo "🏗️ 构建后端..."
    cd "$BACKEND_DIR"
    mvn clean package -DskipTests
    if [ $? -eq 0 ]; then
        print_info "后端构建成功"
    else
        print_error "后端构建失败"
        exit 1
    fi
}

# 构建前端
build_admin() {
    echo "🏗️ 构建管理后台..."

    # 编译 Admin 前端
    cd "$ADMIN_DIR" || { print_error "进入 $ADMIN_DIR 失败"; exit 1; }
    echo "正在安装 Admin 前端依赖..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Admin 前端依赖安装失败"
        exit 1
    fi
    echo "正在编译 Admin 前端代码..."
    npm run build
    if [ $? -ne 0 ]; then
        print_error "Admin 前端编译失败"
        exit 1
    fi
    echo "Admin 前端编译完成！"
    cd "$SCRIPT_DIR" || { print_error "返回 $SCRIPT_DIR 失败"; exit 1; }

    # 编译新的算力监控平台前端
    echo "========== 编译算力监控平台前端 =========="
    cd "$SL_ADMIN_DIR" || { print_error "进入 $SL_ADMIN_DIR 失败"; exit 1; }
    echo "正在安装 SL-admin 前端依赖..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "SL-admin 前端依赖安装失败"
        exit 1
    fi
    echo "正在编译 SL-admin 前端代码..."
    npm run build
    if [ $? -ne 0 ]; then
        print_error "SL-admin 前端编译失败"
        exit 1
    fi
    echo "SL-admin 前端编译完成！"
    cd "$SCRIPT_DIR" || { print_error "返回 $SCRIPT_DIR 失败"; exit 1; }

    print_info "所有管理后台构建成功"
}

# 启动后端
start_backend() {
    echo "🚀 启动后端..."
    
    # 检查是否已运行
    if pgrep -f "backend.*\.jar" > /dev/null; then
        print_warn "后端已在运行中"
        return
    fi
    
    cd "$BACKEND_DIR"
    JAR_FILE=$(ls target/*.jar 2>/dev/null | head -1)
    
    if [ -z "$JAR_FILE" ]; then
        print_error "未找到 JAR 文件，请先构建: ./deploy.sh build"
        return 1
    fi
    
    nohup java -jar "$JAR_FILE" > "$LOG_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"
    
    sleep 3
    if ps -p $BACKEND_PID > /dev/null; then
        print_info "后端已启动 (PID: $BACKEND_PID)"
        print_info "API 地址: http://123.57.226.180:8080"
    else
        print_error "后端启动失败，查看日志: tail -f $LOG_DIR/backend.log"
    fi
}

# 停止后端
stop_backend() {
    echo "⏹️ 停止后端..."
    
    if [ -f "$LOG_DIR/backend.pid" ]; then
        PID=$(cat "$LOG_DIR/backend.pid")
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID
            rm "$LOG_DIR/backend.pid"
            print_info "后端已停止"
        else
            print_warn "后端未运行"
            rm "$LOG_DIR/backend.pid"
        fi
    else
        # 尝试通过进程名停止
        pkill -f "backend.*\.jar" 2>/dev/null
        if [ $? -eq 0 ]; then
            print_info "后端已停止"
        else
            print_warn "后端未运行"
        fi
    fi
}

# 查看状态
status() {
    echo "📊 服务状态:"
    echo ""
    
    # 后端状态
    if pgrep -f "backend.*\.jar" > /dev/null; then
        PID=$(pgrep -f "backend.*\.jar")
        print_info "后端: 运行中 (PID: $PID)"
    else
        print_error "后端: 未运行"
    fi
    
    # 检查端口
    if netstat -tlnp 2>/dev/null | grep -q ":8080"; then
        print_info "端口 8080: 已监听"
    else
        print_warn "端口 8080: 未监听"
    fi
    
    # Nginx 状态
    if systemctl is-active --quiet nginx; then
        print_info "Nginx: 运行中"
    else
        print_warn "Nginx: 未运行"
    fi
}

# 查看日志
view_log() {
    LOG_TYPE=${1:-"backend"}
    case $LOG_TYPE in
        backend|b)
            tail -f "$LOG_DIR/backend.log"
            ;;
        *)
            echo "用法: ./deploy.sh log [backend]"
            ;;
    esac
}

# 帮助信息
show_help() {
    echo "LD-AI Linux 部署脚本"
    echo ""
    echo "用法: ./deploy.sh [命令]"
    echo ""
    echo "命令:"
    echo "  install     安装依赖 (Java, Maven, Node.js)"
    echo "  build       构建项目 (后端 + 前端)"
    echo "  start       启动后端服务"
    echo "  stop        停止后端服务"
    echo "  restart     重启后端服务"
    echo "  status      查看服务状态"
    echo "  log         查看后端日志"
    echo "  help        显示帮助信息"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh install    # 安装依赖"
    echo "  ./deploy.sh build      # 构建项目"
    echo "  ./deploy.sh start      # 启动服务"
    echo "  ./deploy.sh log        # 查看日志"
}

# 主逻辑
case "${1:-help}" in
    install)
        install_deps
        ;;
    build)
        build_backend
        build_admin
        ;;
    build-backend)
        build_backend
        ;;
    build-admin)
        build_admin
        ;;
    start)
        start_backend
        ;;
    stop)
        stop_backend
        ;;
    restart)
        stop_backend
        sleep 2
        start_backend
        ;;
    status)
        status
        ;;
    log)
        view_log "${2:-backend}"
        ;;
    help|*)
        show_help
        ;;
esac
