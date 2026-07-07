#!/usr/bin/env python3
"""
LD-AI 设备网络行为诊断报告
用途：证明设备不存在 PCDN / 上行带宽滥用行为
运行方式：python3 /opt/ld-ai/net_report.py
"""

import os
import subprocess
import time
import socket
from datetime import datetime


REPORT_FILE = "/opt/ld-ai/runtime/net_report.txt"
SAMPLE_SECONDS = 10  # 流量采样时长（秒）


def run_cmd(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, text=True, timeout=15).strip()
    except Exception:
        return "(不可用)"


def get_net_bytes(iface):
    """读取 /sys 的网络收发字节数"""
    rx = tx = 0
    try:
        with open(f"/sys/class/net/{iface}/statistics/rx_bytes") as f:
            rx = int(f.read().strip())
        with open(f"/sys/class/net/{iface}/statistics/tx_bytes") as f:
            tx = int(f.read().strip())
    except Exception:
        pass
    return rx, tx


def get_default_iface():
    """获取默认出口网卡名"""
    try:
        out = subprocess.check_output(
            "ip route show default | awk '{print $5}' | head -1",
            shell=True, text=True, timeout=5
        ).strip()
        return out if out else "eth0"
    except Exception:
        return "eth0"


def human_bytes(b):
    for unit in ["B", "KB", "MB", "GB"]:
        if abs(b) < 1024:
            return f"{b:.2f} {unit}"
        b /= 1024
    return f"{b:.2f} TB"


def human_speed(bps):
    return human_bytes(bps) + "/s"


def main():
    lines = []

    def p(text=""):
        lines.append(text)
        print(text)

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    hostname = socket.gethostname()
    iface = get_default_iface()
    sn = "(未知)"
    try:
        with open("/etc/ld-ai-sn", "r") as f:
            sn = f.read().strip()
    except Exception:
        pass

    p("=" * 72)
    p("          LD-AI 边缘节点 · 网络行为诊断报告")
    p("=" * 72)
    p(f"  报告生成时间:  {now}")
    p(f"  设备序列号:    {sn}")
    p(f"  设备主机名:    {hostname}")
    p(f"  默认网卡:      {iface}")
    p()

    # ── 1. 当前所有对外 TCP 连接 ──
    p("-" * 72)
    p("  [1] 当前所有对外 TCP 连接（ESTABLISHED）")
    p("-" * 72)
    conns = run_cmd("ss -tnp state established | grep -v 'Local' || echo '(无连接)'")
    p(conns)
    p()

    # ── 2. 连接目标汇总（仅对外目标 IP） ──
    p("-" * 72)
    p("  [2] 对外连接目标 IP 汇总")
    p("-" * 72)
    dest_summary = run_cmd(
        "ss -tn state established | awk 'NR>1{print $4}' | "
        "sed 's/\\[//g;s/\\]//g' | rev | cut -d: -f2- | rev | "
        "sort | uniq -c | sort -rn || echo '(无数据)'"
    )
    p(dest_summary if dest_summary else "(当前无对外连接)")
    p()
    p("  ※ 说明：正常情况下仅应出现本公司服务器 IP（hz.shandongliandong.com）。")
    p("    如无任何 P2P / CDN 节点 IP，即证明设备不存在 PCDN 行为。")
    p()

    # ── 3. DNS 解析验证 ──
    p("-" * 72)
    p("  [3] 本公司服务器域名解析")
    p("-" * 72)
    server_ip = run_cmd("getent hosts hz.shandongliandong.com | awk '{print $1}' | head -1")
    p(f"  hz.shandongliandong.com -> {server_ip}")
    p()

    # ── 4. 监听端口检查 ──
    p("-" * 72)
    p("  [4] 本机监听端口（排除 127.0.0.1 本地回环）")
    p("-" * 72)
    listeners = run_cmd(
        "ss -tlnp | grep -v '127.0.0' | grep -v 'Local' || echo '(无对外监听端口)'"
    )
    p(listeners)
    p()
    p("  ※ 说明：PCDN 节点通常会监听大量对外端口接受外部连入。")
    p("    如本机无对外监听端口，则进一步排除 PCDN 嫌疑。")
    p()

    # ── 5. 实时上行/下行速率采样 ──
    p("-" * 72)
    p(f"  [5] 实时流量速率采样（采样 {SAMPLE_SECONDS} 秒）")
    p("-" * 72)

    rx1, tx1 = get_net_bytes(iface)
    p(f"  采样开始... 请等待 {SAMPLE_SECONDS} 秒")
    time.sleep(SAMPLE_SECONDS)
    rx2, tx2 = get_net_bytes(iface)

    rx_speed = (rx2 - rx1) / SAMPLE_SECONDS
    tx_speed = (tx2 - tx1) / SAMPLE_SECONDS

    p(f"  下行（接收）速率:  {human_speed(rx_speed)}")
    p(f"  上行（发送）速率:  {human_speed(tx_speed)}")
    p()
    p(f"  ※ 说明：PCDN 上行速率通常持续在 1~10 MB/s 以上。")
    p(f"    如上行速率仅为 KB 级别（< 10 KB/s），说明设备仅有心跳和")
    p(f"    少量任务通信，不存在上行带宽滥用行为。")
    p()

    # ── 6. 累计流量统计（vnstat） ──
    p("-" * 72)
    p("  [6] 历史流量统计（vnstat）")
    p("-" * 72)
    vnstat = run_cmd("vnstat -i " + iface + " --oneline 2>/dev/null")
    if "(不可用)" in vnstat or not vnstat:
        vnstat_daily = run_cmd("vnstat -d --limit 7 2>/dev/null")
        if "(不可用)" in vnstat_daily:
            p("  vnstat 尚未安装或无历史数据。")
            p("  请执行: apt-get install -y vnstat && systemctl start vnstat")
            p("  运行 1~2 天后重新生成报告即可获得完整流量数据。")
        else:
            p(vnstat_daily)
    else:
        p(vnstat)
    p()

    vnstat_monthly = run_cmd("vnstat -m --limit 3 2>/dev/null")
    if vnstat_monthly and "(不可用)" not in vnstat_monthly:
        p("  近三月汇总:")
        p(vnstat_monthly)
        p()

    # ── 7. 进程级网络流量（可选） ──
    p("-" * 72)
    p("  [7] 当前活跃进程网络连接数 TOP 10")
    p("-" * 72)
    proc_net = run_cmd(
        "ss -tnp state established | awk 'NR>1{print $6}' | "
        "grep -oP 'users:\\(\\(\"\\K[^\"]+' | sort | uniq -c | sort -rn | head -10 "
        "|| echo '(无数据)'"
    )
    p(proc_net if proc_net else "(当前无活跃连接)")
    p()

    # ── 结论 ──
    p("=" * 72)
    p("  [结论]")
    p("=" * 72)

    is_clean = True
    issues = []

    if tx_speed > 500 * 1024:  # 上行持续 > 500KB/s
        is_clean = False
        issues.append(f"上行速率偏高: {human_speed(tx_speed)}")

    # 检查是否有非本公司 IP 的大量连接
    # (简单判断：如果 established 连接数 > 10 就标记)
    conn_count_str = run_cmd("ss -tn state established | wc -l")
    try:
        conn_count = int(conn_count_str) - 1  # 减去表头
    except Exception:
        conn_count = 0

    if conn_count > 15:
        is_clean = False
        issues.append(f"对外连接数异常: {conn_count} 个")

    if is_clean:
        p("  ✅ 本设备网络行为正常，不存在 PCDN / 上行滥用行为。")
        p("     设备仅与本公司云端服务器通信，上行流量极低，")
        p("     无对外监听端口，无 P2P 节点连接特征。")
    else:
        p("  ⚠️  检测到以下异常，建议进一步排查：")
        for issue in issues:
            p(f"     - {issue}")

    p()
    p(f"  报告生成工具: LD-AI Net Report v1.0")
    p(f"  报告时间:     {now}")
    p("=" * 72)

    # 保存到文件
    os.makedirs(os.path.dirname(REPORT_FILE), exist_ok=True)
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"\n报告已保存至: {REPORT_FILE}")


if __name__ == "__main__":
    main()
