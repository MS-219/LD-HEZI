#!/bin/bash

# 全球云智算 - 全网设备 Agent 批量热升级工具
# 该脚本在管理服务器运行，通过 SSH 批量升级所有联网设备

# 配置
REMOTE_USER="root"
REMOTE_PATH="/opt/ld-ai/device_agent"
LOCAL_BINARY="./device_agent/device_agent_linux"
DATABASE_CMD="mysql -uroot -proot ld_ai -e 'SELECT location FROM device WHERE status=1 AND location IS NOT NULL AND location != \"未知位置\";' -N"

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 开始全网设备热升级..."

# 1. 检查本地二进制文件
if [ ! -f "$LOCAL_BINARY" ]; then
    echo -e "${RED}出错: 未找到本地二进制文件 $LOCAL_BINARY${NC}"
    exit 1
fi

# 2. 获取所有在线设备的 IP (假设存在 location 字段中，如果不是，请修改 SQL)
# 提示: 如果你心跳里存了 IP，就查 IP 字段
IPS=$(mysql -uroot -proot ld_ai -e "SELECT DISTINCT location FROM device WHERE status=1;" -N | grep -E '^[0-9.]+$')

if [ -z "$IPS" ]; then
    echo "未找到任何在线或具有 IP 的设备。"
    exit 0
fi

for IP in $IPS; do
    echo -n "正在升级设备 $IP ... "
    
    # 3. 推送并重启 (使用 -o BatchMode=yes 避免死等)
    scp -o BatchMode=yes -o ConnectTimeout=5 "$LOCAL_BINARY" "${REMOTE_USER}@${IP}:${REMOTE_PATH}" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        ssh -o BatchMode=yes -o ConnectTimeout=5 "${REMOTE_USER}@${IP}" "systemctl restart ld-ai" > /dev/null 2>&1
        echo -e "${GREEN}成功${NC}"
    else
        echo -e "${RED}失败 (连接超时或无权限)${NC}"
    fi
done

echo "✅ 批量处理完成。"
