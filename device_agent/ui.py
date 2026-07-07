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
ROLLING_LOGS = deque(maxlen=18)
LAST_IMPORTED_LOGS = []


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


def sanitize_log(text):
    text = "" if text is None else str(text)
    text = re.sub(r"https?://[^\s]+", "[REDACTED]", text)
    text = re.sub(r"host='[^']+'", "host='[REDACTED]'", text)
    text = re.sub(r"port=\d+", "port=***", text)
    text = text.replace("HTTPSConnectionPool", "EDGE-LINK")
    text = text.replace("HTTPConnectionPool", "EDGE-LINK")
    return text


def build_fake_log(sn, frame):
    tasks = ["BLOCK", "HASH ", "SYNC ", "NODE ", "CALC ", "SIG  ", "QUEUE", "ROUTE", "MESH ", "PULSE"]
    task = tasks[frame % len(tasks)]
    target = sn[3:11].replace("-", "") if len(sn) >= 11 else sn.replace("-", "")
    return f"[{time.strftime('%H:%M:%S')}] {task} 0x{(frame * 1103515245) & 0xFFFFFFFF:08X} -> {target} STATUS: OK"


def build_matrix_line(sn, frame):
    core = sn[3:11].replace("-", "") if len(sn) >= 11 else sn.replace("-", "")
    left = f"{(frame * 2654435761) & 0xFFFFFFFF:08X}"
    right = f"{(frame * 40503 + 97) & 0xFFFFFF:06X}"
    tags = ["EDGE", "CORE", "GRID", "LINK", "NODE", "FLOW"]
    return f"[{time.strftime('%H:%M:%S')}] {tags[frame % len(tags)]} :: {left} => {core} => {right}"


def build_activity_lines(sn, frame):
    core = sn[3:11].replace("-", "") if len(sn) >= 11 else sn.replace("-", "")
    values = [
        ("PULSE", 30 + (frame * 7) % 68),
        ("SYNC ", 25 + (frame * 11) % 72),
        ("ROUTE", 20 + (frame * 13) % 74),
        ("CACHE", 18 + (frame * 17) % 76),
    ]
    lines = []
    for label, pct in values:
        bars = int(pct / 5)
        bar = "#" * bars + "-" * (20 - bars)
        lines.append(f"  {label}: [{bar}] {pct:>3}%   0x{(frame * 4099 + pct) & 0xFFFF:04X} -> {core}")
    return lines


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
                f"[{time.strftime('%H:%M:%S')}] TASK  status={status.get('currentTask', 'IDLE')} result={status.get('lastTaskStatus', 'WAITING')}"
            )


def render(frame):

    status = load_status()
    sn = status.get("sn") or load_sn()
    bind_code = status.get("bindCode") or generate_bind_code(sn)
    ip = status.get("ip") or "127.0.0.1"
    online = bool(status.get("online"))
    last_error = status.get("lastError") or "UNKNOWN"

    width = max(96, shutil.get_terminal_size((120, 32)).columns)
    refresh_logs(status, sn, frame, online)
    visible_logs = list(ROLLING_LOGS)[-12:]

    clear()
    print(color(f"================= [ LD-AI DEVICE AGENT {APP_VERSION} ] =================", "1;33"))
    print()
    print(f"  DEVICE SN:      {color(sn, '1;32')}")
    print(f"  BINDING CODE:   {color(bind_code, '1;35')}")
    print(f"  LOCAL NETWORK:  {color(ip, '1;34')}")

    if online:
        status_str = color("[ONLINE / OK]", "1;32")
    else:
        status_str = color(f"[OFFLINE: {fit(last_error, 48)}]", "1;31")

    print(f"  SYSTEM STATUS:  {status_str}")
    print()
    print(color("  Please enter BINDING CODE in Mini-Program to activate device.", "1;37"))
    print()
    print(color("---------------------- [ REAL-TIME SYSTEM LOGS ] ----------------------", "1;36"))

    for line in visible_logs:
        print(" " + fit(line, width - 2))

    for _ in range(max(0, 12 - len(visible_logs))):
        print(" ")

    task_line = status.get("currentTask") or "IDLE"
    result_line = status.get("lastTaskStatus") or "WAITING"
    heartbeat_line = status.get("lastHeartbeatTime") or "-"
    print()
    print(color("---------------------- [ LIVE COMPUTE ACTIVITY ] ----------------------", "1;36"))
    for line in build_activity_lines(sn, frame if online else 0):
        print(color(line, "0;32"))
    print(" ")
    print()
    print(color("---------------------- [ EDGE NODE STATUS PANEL ] ---------------------", "1;36"))
    print(f"  CURRENT TASK:   {color(task_line, '1;33')}")
    print(f"  LAST RESULT:    {color(result_line, '1;32' if result_line == 'COMPLETED' else '1;37')}")
    print(f"  LAST HEARTBEAT: {heartbeat_line}")
    print(f"  NODE VERSION:   {color(status.get('agentVersion', APP_VERSION), '1;35')}")
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
            print(f"LD-AI screen error: {exc}")
            time.sleep(1)


if __name__ == "__main__":
    main()
