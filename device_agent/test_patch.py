import re

with open('/Users/pings/Documents/XMKF/LD-AI/device_agent/ui.py', 'r') as f:
    s = f.read()

# Make sure we don't double patch
if 'refresh_logs(status, sn, frame, online)' not in s:
    s = s.replace('def refresh_logs(status, sn, frame):', 'def refresh_logs(status, sn, frame, online):')
    s = s.replace('refresh_logs(status, sn, frame)', 'refresh_logs(status, sn, frame, online)')
    s = s.replace('build_activity_lines(sn, frame)', 'build_activity_lines(sn, frame if online else 0)')
    
    # Indent the 3 rolling logs blocks under `if online:`
    target = """    if frame % 2 == 0:
        ROLLING_LOGS.append(build_fake_log(sn, frame))
    if frame % 3 == 0:
        ROLLING_LOGS.append(build_matrix_line(sn, frame))
    if frame % 5 == 0:
        ROLLING_LOGS.append(
            f"[{time.strftime('%H:%M:%S')}] TASK  status={status.get('currentTask', 'IDLE')} result={status.get('lastTaskStatus', 'WAITING')}"
        )"""

    replacement = """    if online:
        if frame % 2 == 0:
            ROLLING_LOGS.append(build_fake_log(sn, frame))
        if frame % 3 == 0:
            ROLLING_LOGS.append(build_matrix_line(sn, frame))
        if frame % 5 == 0:
            ROLLING_LOGS.append(
                f"[{time.strftime('%H:%M:%S')}] TASK  status={status.get('currentTask', 'IDLE')} result={status.get('lastTaskStatus', 'WAITING')}"
            )"""

    s = s.replace(target, replacement)

print("Check success:", repr(s[:20]))
