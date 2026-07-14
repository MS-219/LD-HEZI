#!/bin/bash

set -e

# LD-AI 边缘 Agent 安装脚本
# 安装 Python 任务 Agent，沿用设备本机已有 SN 持久化文件

if [ "$EUID" -ne 0 ]; then
  echo "请以 root 权限运行"
  exit 1
fi

echo "开始部署 LD-AI 边缘节点环境..."

SN_FILE="${LD_AI_SN_FILE:-/etc/ld-ai-sn}"
ORIGINAL_SN=""
if [ -f "$SN_FILE" ]; then
  ORIGINAL_SN="$(cat "$SN_FILE" 2>/dev/null | tr -d '\r\n' || true)"
fi
if [ -n "$ORIGINAL_SN" ]; then
  echo "检测到现有设备码: $ORIGINAL_SN"
else
  echo "未检测到现有设备码，新 Agent 首次启动时会按硬件信息生成。"
fi

# 1. 创建目录并停止旧服务
mkdir -p /opt/ld-ai
if [ "${LD_AI_REMOTE_UPGRADE:-0}" = "1" ]; then
  echo "远程在线升级模式：先安装文件，稍后重启服务，避免中断当前命令链路。"
else
  systemctl disable ld-ai 2>/dev/null || true
  systemctl stop ld-ai 2>/dev/null || true
  systemctl stop ld-ai-terminal.service 2>/dev/null || true
  systemctl disable ld-ai-terminal.service 2>/dev/null || true
  systemctl stop ld-ai-edge 2>/dev/null || true
  systemctl disable ld-ai-edge 2>/dev/null || true
  systemctl stop ld-ai-screen.service 2>/dev/null || true
  systemctl disable ld-ai-screen.service 2>/dev/null || true
fi

# 2. 复制程序文件
cp ./agent.py /opt/ld-ai/agent.py
cp ./ui.py /opt/ld-ai/ui.py
cp ./terminal-agent.py /opt/ld-ai/terminal-agent.py
cp ./proxy-control.sh /opt/ld-ai/proxy-control.sh
cp ./tunnel-control.sh /opt/ld-ai/tunnel-control.sh
chmod 755 /opt/ld-ai/agent.py
chmod 755 /opt/ld-ai/ui.py
chmod 755 /opt/ld-ai/terminal-agent.py
chmod 755 /opt/ld-ai/proxy-control.sh
chmod 755 /opt/ld-ai/tunnel-control.sh
mkdir -p /opt/ld-ai/runtime

# 3. 安装 Python 依赖
echo "安装 Python 环境..."
if command -v apt-get >/dev/null 2>&1; then
  apt-get update && apt-get install -y python3 python3-pip openssh-client
elif command -v yum >/dev/null 2>&1; then
  yum install -y python3 python3-pip openssh-clients
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y python3 python3-pip openssh-clients
else
  echo "未识别包管理器，请手动确认 python3/pip3/ssh 是否存在" >&2
fi
if command -v pip3 >/dev/null 2>&1; then
  pip3 install requests psutil websocket-client --break-system-packages 2>/dev/null || pip3 install requests psutil websocket-client
else
  echo "缺少 pip3，无法安装 Python 依赖" >&2
fi

if [ -n "${LD_AI_TARGET_VERSION:-}" ] && command -v python3 >/dev/null 2>&1; then
  python3 - "$LD_AI_TARGET_VERSION" <<'PY'
import re
import sys

version = sys.argv[1]
path = "/opt/ld-ai/agent.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
content = re.sub(r'^AGENT_VERSION\s*=\s*["\'][^"\']*["\']', f'AGENT_VERSION = "{version}"', content, count=1, flags=re.M)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

ui_path = "/opt/ld-ai/ui.py"
with open(ui_path, "r", encoding="utf-8") as f:
    ui_content = f.read()
ui_content = re.sub(r'^APP_VERSION\s*=\s*["\'][^"\']*["\']', f'APP_VERSION = "{version}"', ui_content, count=1, flags=re.M)
with open(ui_path, "w", encoding="utf-8") as f:
    f.write(ui_content)
PY
  echo "已写入 Agent 目标版本: ${LD_AI_TARGET_VERSION}"
fi

# 4. 配置边缘 Agent 服务
cat > /etc/systemd/system/ld-ai-edge.service <<EOF
[Unit]
Description=LD-AI Edge Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/ld-ai/agent.py
Restart=always
RestartSec=5
User=root
WorkingDirectory=/opt/ld-ai
Environment=LD_AI_CLOUD_URL=https://hz.shandongliandong.com
Environment=LD_AI_OLLAMA_URL=http://127.0.0.1:11434
Environment=LD_AI_HEARTBEAT_INTERVAL=60
Environment=LD_AI_IMAGE_VERSION_FILE=/etc/ld-ai-image-version

[Install]
WantedBy=multi-user.target
EOF

# 5. 配置远程终端隧道服务
cat > /etc/systemd/system/ld-ai-terminal.service <<EOF
[Unit]
Description=LD-AI Remote Terminal Tunnel
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/ld-ai/terminal-agent.py
Restart=always
RestartSec=5
User=root
WorkingDirectory=/opt/ld-ai
Environment=LD_AI_TERMINAL_WS=wss://hz.shandongliandong.com/ws/device/

[Install]
WantedBy=multi-user.target
EOF

# 6. 配置本地开机展示服务
cat > /etc/systemd/system/ld-ai-screen.service <<EOF
[Unit]
Description=LD-AI Boot Screen
After=network.target ld-ai-edge.service
Conflicts=getty@tty1.service

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/ld-ai/ui.py
Restart=always
RestartSec=2
User=root
WorkingDirectory=/opt/ld-ai
StandardInput=tty
StandardOutput=tty
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
TTYVTDisallocate=yes

[Install]
WantedBy=multi-user.target
EOF

# 7. 激活服务
systemctl daemon-reload
systemctl enable ld-ai-edge.service
systemctl enable ld-ai-terminal.service
systemctl enable ld-ai-screen.service

if [ -n "$ORIGINAL_SN" ]; then
  CURRENT_SN="$(cat "$SN_FILE" 2>/dev/null | tr -d '\r\n' || true)"
  if [ "$CURRENT_SN" != "$ORIGINAL_SN" ]; then
    echo "严重错误：设备码发生变化，已恢复原设备码" >&2
    echo "$ORIGINAL_SN" > "$SN_FILE"
    systemctl restart ld-ai-edge.service 2>/dev/null || true
    exit 9
  fi
  echo "设备码校验通过: $CURRENT_SN"
fi

if [ "${LD_AI_REMOTE_UPGRADE:-0}" = "1" ]; then
  nohup sh -c 'sleep 8; systemctl restart ld-ai-edge.service; systemctl restart ld-ai-terminal.service; systemctl restart ld-ai-screen.service; sleep 10; if systemctl is-active --quiet ld-ai-edge.service; then systemctl stop ld-ai 2>/dev/null || true; echo LD_AI_OLD_AGENT_STOPPED; else echo LD_AI_NEW_AGENT_NOT_ACTIVE_KEEP_OLD; fi' >>/opt/ld-ai/runtime/upgrade.log 2>&1 &
  echo "已安排后台重启新 Agent；确认新 edge 服务运行后才会停止旧 ld-ai 服务。"
else
  systemctl restart ld-ai-edge.service
  systemctl restart ld-ai-terminal.service
  systemctl restart ld-ai-screen.service
fi

echo "部署完成，ld-ai-edge.service、ld-ai-terminal.service 与 ld-ai-screen.service 已启动。"
systemctl --no-pager --full status ld-ai-edge.service || true
systemctl --no-pager --full status ld-ai-terminal.service || true
systemctl --no-pager --full status ld-ai-screen.service || true
