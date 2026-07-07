#!/bin/bash
# 彻底解决 Ubuntu 联网与开机卡顿的终极脚本

echo "开始执行全自动网络修复..."

# 1. 清理旧配置
rm -rf /etc/netplan/*.yaml

# 2. 搬运新配置
cp ~/01-config.yaml /etc/netplan/01-config.yaml
chmod 600 /etc/netplan/01-config.yaml

# 3. 修复 DNS 服务
systemctl unmask systemd-resolved
systemctl enable systemd-resolved
systemctl restart systemd-resolved

# 4. 彻底禁用启动等待（解决那2分钟红星卡顿）
systemctl disable systemd-networkd-wait-online.service
systemctl mask systemd-networkd-wait-online.service

# 5. 生效网络配置
netplan apply

echo "修复完成！5秒后将自动重启..."
sleep 5
reboot
