import json
import os
import sys
import time
import shutil
import hashlib
import re
from collections import deque


STATUS_FILE = os.getenv("LD_AI_STATUS_FILE", "/opt/ld-ai/runtime/status.json")
SN_FILE = os.getenv("LD_AI_SN_FILE", "/etc/ld-ai-sn")
APP_VERSION = "V4.0"
FRAME = 0
ROLLING_LOGS = deque(maxlen=24)
LAST_IMPORTED_LOGS = []
SCREEN_NAME = "HEZI NODE CONSOLE"


def load_sn():
    if os.path.exists(SN_FILE):
        with open(SN_FILE, "r", encoding="utf-8") as f:
            return f.read().strip()
    return "JX-UNKNOWN"


def generate_bind_code(sn):
    digest = hashlib.md5(f"{sn}juxin_salt_2025".encode("utf-8")).hexdigest()
    return "JX" + digest[:6].upper()


def load_status():
    sn = load_sn()
    fallback = {
        "sn": sn,
        "bindCode": generate_bind_code(sn),
        "agentVersion": APP_VERSION,
        "online": False,
        "lastHeartbeatTime": "",
        "lastError": "WAITING",
        "ip": "127.0.0.1",
        "currentTask": "IDLE",
        "lastTaskStatus": "WAITING",
        "logs": [],
    }
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                fallback.update(json.load(f))
        except Exception:
            pass
    return fallback


def clear():
    sys.stdout.write("\033[H\033[J")


def color(text, code):
    return f"\033[{code}m{text}\033[0m"


def fit(text, width):
    text = "" if text is None else str(text)
    if len(text) <= width:
        return text
    if width <= 3:
        return text[:width]
    return text[: width - 3] + "..."


def pad(text, width):
    text = fit(text, width)
    return text + " " * max(0, width - len(text))


def line(width, left="", right=""):
    if not left and not right:
        return "-" * width
    middle = max(2, width - len(left) - len(right) - 2)
    return f"{left}{'-' * middle}{right}"


def metric_card(label, value, width, accent="1;36"):
    body = f"{label:<11} {value}"
    return color(pad(body, width), accent)


def sanitize_log(text):
    text = "" if text is None else str(text)
    text = re.sub(r"https?://[^\s]+", "[REDACTED]", text)
    text = re.sub(r"host='[^']+'", "host='[REDACTED]'", text)
    text = re.sub(r"port=\d+", "port=***", text)
    text = text.replace("HTTPSConnectionPool", "EDGE-LINK")
    text = text.replace("HTTPConnectionPool", "EDGE-LINK")
    return text


def build_fake_log(sn, frame):
    tasks = ["BOOT ", "SCAN ", "TRACE", "FLOW ", "AUTH ", "QUEUE", "ROUTE", "LOAD ", "TASK ", "SYNC "]
    task = tasks[frame % len(tasks)]
    target = sn[3:11].replace("-", "") if len(sn) >= 11 else sn.replace("-", "")
    return f"{time.strftime('%H:%M:%S')} | {task} | lane={target:<8} | seq={(frame * 1103515245) & 0xFFFF:04X} | accepted"


def build_matrix_line(sn, frame):
    core = sn[3:11].replace("-", "") if len(sn) >= 11 else sn.replace("-", "")
    left = f"{(frame * 2654435761) & 0xFFFFFFFF:08X}"
    right = f"{(frame * 40503 + 97) & 0xFFFFFF:06X}"
    tags = ["UPLK", "CTRL", "SPAN", "WORK", "NODE", "MESH"]
    return f"{time.strftime('%H:%M:%S')} | {tags[frame % len(tags)]} | {left[:6]}:{core}:{right[-4:]} | telemetry"


def build_activity_lines(sn, frame):
    core = sn[3:11].replace("-", "") if len(sn) >= 11 else sn.replace("-", "")
    values = [
        ("uplink", 30 + (frame * 7) % 68),
        ("queue ", 25 + (frame * 11) % 72),
        ("route ", 20 + (frame * 13) % 74),
        ("cache ", 18 + (frame * 17) % 76),
    ]
    lines = []
    for label, pct in values:
        bars = int(pct / 4)
        bar = "=" * bars + "." * (25 - bars)
        lines.append(f"{label} [{bar}] {pct:>3}%  bus:{(frame * 4099 + pct) & 0xFFFF:04X}  node:{core}")
    return lines


def build_signal_rows(frame, online):
    seed = frame if online else 0
    rows = [
        ("cpu lane", 35 + (seed * 9) % 55),
        ("net io", 20 + (seed * 13) % 70),
        ("job ring", 18 + (seed * 17) % 75),
    ]
    rendered = []
    for name, pct in rows:
        bars = int(pct / 10)
        meter = "|" * bars + "." * (10 - bars)
        rendered.append(f"{name:<8} {meter} {pct:>3}%")
    return rendered


def refresh_logs(status, sn, frame, online):
    global LAST_IMPORTED_LOGS
    status_logs = [sanitize_log(line) for line in list(status.get("logs") or [])]
    if status_logs != LAST_IMPORTED_LOGS:
        existing = set(ROLLING_LOGS)
        for line in status_logs[-6:]:
            if line and line not in existing:
                ROLLING_LOGS.append(line)
                existing.add(line)
        LAST_IMPORTED_LOGS = status_logs

    if online:
        if frame % 2 == 0:
            ROLLING_LOGS.append(build_fake_log(sn, frame))
        if frame % 3 == 0:
            ROLLING_LOGS.append(build_matrix_line(sn, frame))
        if frame % 5 == 0:
            ROLLING_LOGS.append(
                f"{time.strftime('%H:%M:%S')} | TASK  | now={status.get('currentTask', 'IDLE')} | last={status.get('lastTaskStatus', 'WAITING')}"
            )


def render_header(width, online):
    pulse = ("ON " if online else "STBY") if FRAME % 2 else ("RUN" if online else "IDLE")
    title = f" {SCREEN_NAME} "
    right = f" {APP_VERSION} / {pulse} "
    print(color(line(width, title, right), "1;36"))


def render_identity(width, sn, bind_code, ip, online, last_error):
    left_width = min(54, max(42, width // 2 - 3))
    right_width = width - left_width - 3
    state = "ONLINE" if online else "OFFLINE"
    state_color = "1;32" if online else "1;31"
    reason = "ready" if online else fit(last_error, right_width - 18)
    left_rows = [
        metric_card("serial", sn, left_width, "1;37"),
        metric_card("pair key", bind_code, left_width, "1;35"),
        metric_card("network", ip, left_width, "1;34"),
    ]
    right_rows = [
        f"{color('state', '0;37'):<17} {color(state, state_color)}",
        f"{color('message', '0;37'):<17} {fit(reason, right_width - 13)}",
        f"{color('action', '0;37'):<17} enter pair key in the client app",
    ]
    print(color("NODE IDENTITY", "1;30") + "   " + color("CONTROL LINK", "1;30"))
    for left, right in zip(left_rows, right_rows):
        print(f"{left}   {fit(right, right_width)}")


def render_logs(width, visible_logs):
    print()
    print(color(line(width, " EVENT STREAM ", ""), "1;30"))
    if not visible_logs:
        visible_logs = [f"{time.strftime('%H:%M:%S')} | BOOT  | waiting for first heartbeat"]
    for line_text in visible_logs[-10:]:
        print(color("  >", "1;32") + " " + fit(line_text, width - 5))
    for _ in range(max(0, 10 - len(visible_logs[-10:]))):
        print(" ")


def render_runtime(width, status, sn, frame, online):
    task_line = status.get("currentTask") or "IDLE"
    result_line = status.get("lastTaskStatus") or "WAITING"
    heartbeat_line = status.get("lastHeartbeatTime") or "-"
    version_line = status.get("agentVersion", APP_VERSION)
    print()
    print(color(line(width, " WORKLOAD TELEMETRY ", ""), "1;30"))
    activity_lines = build_activity_lines(sn, frame if online else 0)
    signal_rows = build_signal_rows(frame, online)
    left_width = min(62, max(46, width - 36))
    right_width = width - left_width - 3
    for index, activity in enumerate(activity_lines):
        right = signal_rows[index] if index < len(signal_rows) else ""
        print(f"  {color(pad(activity, left_width), '0;36')}   {color(fit(right, right_width), '0;32')}")
    print()
    print(color(line(width, " SESSION SNAPSHOT ", ""), "1;30"))
    result_color = "1;32" if result_line == "COMPLETED" else "1;37"
    print(f"  task      {color(fit(task_line, 34), '1;33')}   result {color(fit(result_line, 24), result_color)}")
    print(f"  heartbeat {fit(heartbeat_line, 34)}   build  {color(version_line, '1;35')}")


def render(frame):
    global FRAME
    FRAME = frame

    status = load_status()
    sn = status.get("sn") or load_sn()
    bind_code = status.get("bindCode") or generate_bind_code(sn)
    ip = status.get("ip") or "127.0.0.1"
    online = bool(status.get("online"))
    last_error = status.get("lastError") or "UNKNOWN"

    width = max(96, shutil.get_terminal_size((120, 32)).columns)
    refresh_logs(status, sn, frame, online)
    visible_logs = list(ROLLING_LOGS)[-10:]

    clear()
    render_header(width, online)
    print()
    render_identity(width, sn, bind_code, ip, online, last_error)
    render_logs(width, visible_logs)
    render_runtime(width, status, sn, frame, online)
    print()
    print(color(line(width, "", " local display only "), "1;30"))
    sys.stdout.flush()


def main():
    frame = 0
    while True:
        try:
            frame += 1
            render(frame)
            time.sleep(0.25)
        except KeyboardInterrupt:
            break
        except Exception as exc:
            clear()
            print(f"{SCREEN_NAME} screen error: {exc}")
            time.sleep(1)


if __name__ == "__main__":
    main()
