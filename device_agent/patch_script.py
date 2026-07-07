with open('/Users/pings/Documents/XMKF/LD-AI/device_agent/ui.py', 'r') as f:
    orig = f.read()
    
# Find the exact lines that were patched
target_block = """    if frame % 2 == 0:
        ROLLING_LOGS.append(build_fake_log(sn, frame))
    if frame % 3 == 0:
        ROLLING_LOGS.append(build_matrix_line(sn, frame))
    if frame % 5 == 0:
        ROLLING_LOGS.append(
            f"[{time.strftime('%H:%M:%S')}] TASK  status={status.get('currentTask', 'IDLE')} result={status.get('lastTaskStatus', 'WAITING')}"
        )"""

new_block = """    if online:
        if frame % 2 == 0:
            ROLLING_LOGS.append(build_fake_log(sn, frame))
        if frame % 3 == 0:
            ROLLING_LOGS.append(build_matrix_line(sn, frame))
        if frame % 5 == 0:
            ROLLING_LOGS.append(
                f"[{time.strftime('%H:%M:%S')}] TASK  status={status.get('currentTask', 'IDLE')} result={status.get('lastTaskStatus', 'WAITING')}"
            )"""

print(target_block in orig)
