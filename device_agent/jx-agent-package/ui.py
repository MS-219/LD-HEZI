import hashlib
import json
import math
import os
import re
import shutil
import sys
import time
from datetime import datetime


STATUS_FILE = os.getenv("LD_AI_STATUS_FILE", "/opt/ld-ai/runtime/status.json")
SN_FILE = os.getenv("LD_AI_SN_FILE", "/etc/ld-ai-sn")
APP_VERSION = "V4.0"
SCREEN_NAME = "LD CLOUD EDGE"
ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")
SPARKS = "▁▂▃▄▅▆▇█"
SPINNERS = ("◢", "◣", "◤", "◥")


def style(text, code):
    return f"\033[{code}m{text}\033[0m"


def visible_len(text):
    return len(ANSI_RE.sub("", str(text)))


def pad_ansi(text, width):
    return str(text) + " " * max(0, width - visible_len(text))


def fit(text, width):
    value = "" if text is None else str(text)
    if len(value) <= width:
        return value
    if width <= 3:
        return value[:width]
    return value[: width - 3] + "..."


def load_sn():
    try:
        if os.path.exists(SN_FILE):
            with open(SN_FILE, "r", encoding="utf-8") as f:
                sn = f.read().strip()
            if sn.startswith("JX-"):
                sn = "LD-" + sn[3:]
            return sn or "LD-UNKNOWN"
    except Exception:
        pass
    return "LD-UNKNOWN"


def generate_bind_code(sn):
    digest = hashlib.md5(f"{sn}juxin_salt_2025".encode("utf-8")).hexdigest()
    return "LD" + digest[:6].upper()


def load_status():
    sn = load_sn()
    fallback = {
        "sn": sn,
        "bindCode": generate_bind_code(sn),
        "agentVersion": APP_VERSION,
        "bootTime": "",
        "online": False,
        "lastHeartbeatTime": "",
        "lastError": "WAITING FOR FIRST HEARTBEAT",
        "ip": "127.0.0.1",
        "cpuLoad": 0,
        "memLoad": 0,
        "cpuModel": "Unknown CPU",
        "currentTask": "IDLE",
        "lastTaskStatus": "WAITING",
        "lastTaskType": "",
        "logs": [],
    }
    try:
        if os.path.exists(STATUS_FILE):
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                fallback.update(json.load(f))
    except Exception:
        pass

    # status.json may still contain the previous prefix during a rolling restart.
    status_sn = str(fallback.get("sn") or sn)
    if status_sn.startswith("JX-"):
        status_sn = "LD-" + status_sn[3:]
    fallback["sn"] = status_sn
    fallback["bindCode"] = generate_bind_code(status_sn)
    return fallback


def safe_number(value, default=0.0):
    try:
        return max(0.0, min(100.0, float(value)))
    except (TypeError, ValueError):
        return default


def bar(value, width=24):
    value = safe_number(value)
    filled = int(round(width * value / 100.0))
    return "█" * filled + "░" * max(0, width - filled)


def sparkline(base, frame, count=18, phase=0.0):
    base = safe_number(base)
    values = []
    for index in range(count):
        wave = math.sin((frame + index) * 0.47 + phase) * 8
        ripple = math.sin((frame - index) * 0.19 + phase * 2) * 4
        value = max(0.0, min(100.0, base + wave + ripple))
        spark_index = min(len(SPARKS) - 1, int(value / 100 * len(SPARKS)))
        values.append(SPARKS[spark_index])
    return "".join(values)


def sanitize_log(text):
    value = "" if text is None else str(text)
    value = re.sub(r"https?://[^\s]+", "[cloud]", value)
    value = re.sub(r"host='[^']+'", "host='cloud'", value)
    value = re.sub(r"port=\d+", "port=*", value)
    return value.replace("HTTPSConnectionPool", "EDGE-LINK").replace("HTTPConnectionPool", "EDGE-LINK")


def heartbeat_age(value):
    if not value:
        return "not received"
    try:
        stamp = datetime.strptime(str(value), "%Y-%m-%d %H:%M:%S")
        seconds = max(0, int((datetime.now() - stamp).total_seconds()))
        if seconds < 60:
            return f"{seconds}s ago"
        if seconds < 3600:
            return f"{seconds // 60}m ago"
        return f"{seconds // 3600}h ago"
    except Exception:
        return str(value)


def uptime_text(value):
    if not value:
        return "--"
    try:
        boot = datetime.strptime(str(value), "%Y-%m-%d %H:%M:%S")
        seconds = max(0, int((datetime.now() - boot).total_seconds()))
        days, seconds = divmod(seconds, 86400)
        hours, seconds = divmod(seconds, 3600)
        minutes = seconds // 60
        if days:
            return f"{days}d {hours:02d}h {minutes:02d}m"
        return f"{hours:02d}h {minutes:02d}m"
    except Exception:
        return "--"


def box(title, rows, width, accent="96"):
    inner = max(1, width - 2)
    title_text = f" {fit(title.upper(), inner - 2)} "
    top_fill = max(0, inner - len(title_text))
    lines = [style("╭" + title_text + "─" * top_fill + "╮", accent)]
    for row in rows:
        if isinstance(row, tuple):
            text, color = row
        else:
            text, color = row, "97"
        content = fit(text, inner - 2)
        lines.append(style("│", accent) + " " + style(content.ljust(inner - 2), color) + " " + style("│", accent))
    lines.append(style("╰" + "─" * inner + "╯", accent))
    return lines


def join_columns(left, right, gap=2):
    height = max(len(left), len(right))
    left_width = max((visible_len(line) for line in left), default=0)
    lines = []
    for index in range(height):
        left_line = left[index] if index < len(left) else ""
        right_line = right[index] if index < len(right) else ""
        lines.append(pad_ansi(left_line, left_width) + " " * gap + right_line)
    return lines


def packet_lane(sn, frame, width):
    digest = hashlib.sha256(f"{sn}:{frame // 2}".encode("utf-8")).hexdigest().upper()
    tokens = [digest[index:index + 4] for index in range(0, min(len(digest), 36), 4)]
    lane = "  ".join(tokens)
    shift = frame % max(1, len(lane))
    moving = lane[shift:] + "  " + lane[:shift]
    return fit(moving, width)


def link_animation(frame, online, width):
    if not online:
        return fit("CLOUD  x----x----x  NODE   link unavailable", width)
    track_width = max(12, width - 28)
    position = frame % track_width
    track = ["─"] * track_width
    track[position] = "◆"
    if position > 0:
        track[position - 1] = "╼"
    return fit("CLOUD  " + "".join(track) + "  NODE", width)


def build_identity(status, frame, width):
    sn = status.get("sn") or load_sn()
    bind_code = status.get("bindCode") or generate_bind_code(sn)
    online = bool(status.get("online"))
    state = "ONLINE / SYNCHRONIZED" if online else "OFFLINE / RETRYING"
    state_color = "92" if online else "91"
    pulse = SPINNERS[frame % len(SPINNERS)]
    rows = [
        (f"{pulse}  DEVICE SERIAL    {sn}", "97;1"),
        (f"   PAIRING KEY     {bind_code}", "95;1"),
        (f"   LOCAL ADDRESS   {status.get('ip') or '--'}", "94"),
        (f"   AGENT BUILD     {status.get('agentVersion') or APP_VERSION}", "96"),
        (f"   SYSTEM UPTIME   {uptime_text(status.get('bootTime'))}", "90"),
        (f"   LINK STATE      {state}", state_color + ";1"),
    ]
    return box("Node Identity", rows, width, "96")


def build_link(status, frame, width):
    online = bool(status.get("online"))
    last_error = status.get("lastError") or "UNKNOWN"
    if online:
        message = "Cloud control channel is healthy"
        color = "92"
    else:
        message = sanitize_log(last_error)
        color = "91"
    rows = [
        (link_animation(frame, online, width - 6), "92" if online else "91"),
        (f"   HEARTBEAT       {heartbeat_age(status.get('lastHeartbeatTime'))}", "97"),
        ("   CHANNEL         SECURE / PERSISTENT", "94"),
        (f"   MESSAGE         {fit(message, width - 23)}", color),
        (f"   ACTIVE TASK     {status.get('currentTask') or 'IDLE'}", "93"),
        (f"   LAST RESULT     {status.get('lastTaskStatus') or 'WAITING'}", "90"),
    ]
    return box("Control Link", rows, width, "94")


def build_telemetry(status, frame, width):
    cpu = safe_number(status.get("cpuLoad"))
    memory = safe_number(status.get("memLoad"))
    bar_width = max(12, min(30, width - 45))
    spark_width = max(10, min(22, width - bar_width - 24))
    rows = [
        (f"CPU   {cpu:5.1f}%  {bar(cpu, bar_width)}  {sparkline(cpu, frame, spark_width, 0.2)}", "96"),
        (f"MEM   {memory:5.1f}%  {bar(memory, bar_width)}  {sparkline(memory, frame, spark_width, 1.7)}", "95"),
        (f"HEALTH  {'STABLE' if max(cpu, memory) < 85 else 'HIGH LOAD'}", "92" if max(cpu, memory) < 85 else "93"),
    ]
    return box("Live Telemetry", rows, width, "95")


def build_datastream(status, frame, width):
    sn = status.get("sn") or load_sn()
    online = bool(status.get("online"))
    scan_width = max(12, width - 18)
    marker = frame % scan_width
    scan = ["·"] * scan_width
    scan[marker] = "█"
    if marker > 0:
        scan[marker - 1] = "▓"
    if marker > 1:
        scan[marker - 2] = "▒"
    rows = [
        ("SCAN   " + "".join(scan), "92" if online else "90"),
        ("BUS    " + packet_lane(sn, frame, width - 9), "96"),
        (f"MODE   {'ACTIVE TELEMETRY' if online else 'LOCAL STANDBY'}", "92" if online else "93"),
    ]
    return box("Data Stream", rows, width, "92")


def build_events(status, frame, width):
    logs = [sanitize_log(item) for item in (status.get("logs") or []) if str(item).strip()]
    logs = logs[-4:]
    while len(logs) < 4:
        logs.insert(0, "system ready / waiting for workload")
    rows = []
    for index, item in enumerate(logs):
        marker = ">" if index == len(logs) - 1 and frame % 2 else "·"
        rows.append((f"{marker} {fit(item, width - 7)}", "97" if index == len(logs) - 1 else "90"))
    return box("Event Timeline", rows, width, "90")


def render_frame(status, frame, terminal_width):
    width = max(78, min(160, terminal_width - 1 if terminal_width > 79 else terminal_width))
    online = bool(status.get("online"))
    state = "ONLINE" if online else "OFFLINE"
    state_color = "92;1" if online else "91;1"
    clock = time.strftime("%Y-%m-%d  %H:%M:%S")
    spinner = SPINNERS[frame % len(SPINNERS)]

    title_left = f" {SCREEN_NAME}  //  NODE OPERATING CONSOLE "
    title_right = f" {spinner} {state}  {clock}  {APP_VERSION} "
    if len(title_left) + len(title_right) > width:
        title_left = f" {SCREEN_NAME} "
    fill = max(0, width - len(title_left) - len(title_right))
    lines = [style(title_left, "97;1") + style("─" * fill, "96") + style(title_right, state_color)]
    subtitle = fit("  EDGE COMPUTE FABRIC  /  secure control  /  live telemetry  /  autonomous workload", width)
    lines.append(style(subtitle[:21], "96;1") + style(subtitle[21:], "90"))
    lines.append("")

    if width >= 108:
        gap = 2
        left_width = (width - gap) // 2
        right_width = width - gap - left_width
        lines.extend(join_columns(build_identity(status, frame, left_width), build_link(status, frame, right_width), gap))
        lines.append("")
        lines.extend(join_columns(build_telemetry(status, frame, left_width), build_datastream(status, frame, right_width), gap))
    else:
        lines.extend(build_identity(status, frame, width))
        lines.append("")
        lines.extend(build_link(status, frame, width))
        lines.append("")
        lines.extend(build_telemetry(status, frame, width))
        lines.append("")
        lines.extend(build_datastream(status, frame, width))

    lines.append("")
    lines.extend(build_events(status, frame, width))
    footer = " Pair the node with the LD mobile app using the pairing key above "
    side = max(0, (width - len(footer)) // 2)
    lines.append(style("─" * side + footer + "─" * max(0, width - side - len(footer)), "90"))
    return "\n".join(lines)


def main():
    frame = 0
    once = os.getenv("LD_AI_UI_ONCE", "0") == "1"
    sys.stdout.write("\033[?25l\033[2J")
    sys.stdout.flush()
    try:
        while True:
            frame += 1
            columns = shutil.get_terminal_size((120, 34)).columns
            output = render_frame(load_status(), frame, columns)
            sys.stdout.write("\033[H" + output + "\033[J")
            sys.stdout.flush()
            if once:
                break
            time.sleep(0.4)
    except KeyboardInterrupt:
        pass
    finally:
        sys.stdout.write("\033[0m\033[?25h\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
