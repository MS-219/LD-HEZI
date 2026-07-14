import json
import os
import platform
import socket
import subprocess
import threading
import time
import hashlib
from datetime import datetime

import psutil
import requests


AGENT_VERSION = "V4.0"
CLOUD_URL = os.getenv("LD_AI_CLOUD_URL", "https://hz.shandongliandong.com")
OLLAMA_URL = os.getenv("LD_AI_OLLAMA_URL", "http://127.0.0.1:11434")
SN_FILE = os.getenv("LD_AI_SN_FILE", "/etc/ld-ai-sn")
IMAGE_VERSION_FILE = os.getenv("LD_AI_IMAGE_VERSION_FILE", "/etc/ld-ai-image-version")
HEARTBEAT_INTERVAL = int(os.getenv("LD_AI_HEARTBEAT_INTERVAL", "60"))
TASK_POLL_INTERVAL = int(os.getenv("LD_AI_TASK_POLL_INTERVAL", "60"))
STATUS_FILE = os.getenv("LD_AI_STATUS_FILE", "/opt/ld-ai/runtime/status.json")
MAX_LOG_LINES = 18


def get_persist_path():
    return SN_FILE


def collect_hardware_components():
    components = []

    try:
        with open("/sys/class/dmi/id/product_uuid", "r", encoding="utf-8") as f:
            product_uuid = f.read().strip()
            if product_uuid and product_uuid.lower() != "not specified" and not product_uuid.startswith("0000"):
                components.append(product_uuid)
    except Exception:
        pass

    try:
        for interface, addrs in psutil.net_if_addrs().items():
            if interface == "lo" or "veth" in interface.lower():
                continue
            for addr in addrs:
                if getattr(addr, "family", None) == psutil.AF_LINK:
                    mac = (addr.address or "").strip()
                    if mac and mac != "00:00:00:00:00:00":
                        components.append(mac)
                        raise StopIteration
    except StopIteration:
        pass
    except Exception:
        pass

    return components


def generate_device_sn():
    components = collect_hardware_components()

    if components:
        seed = "|".join(components)
        digest = hashlib.md5(seed.encode("utf-8")).hexdigest().upper()
        return "LD-" + digest[:12]

    return "LD-R-" + time.strftime("%m%d%H%M%S")


def load_device_sn():
    path = get_persist_path()
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            sn = f.read().strip()
            if sn:
                if sn.startswith("JX-"):
                    sn = "LD-" + sn[3:]
                    with open(path, "w", encoding="utf-8") as output:
                        output.write(sn)
                return sn

    sn = generate_device_sn()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(sn)
    return sn


DEVICE_SN = load_device_sn()


def generate_bind_code(sn):
    digest = hashlib.md5(f"{sn}juxin_salt_2025".encode("utf-8")).hexdigest()
    return "LD" + digest[:6].upper()


def load_image_version():
    env_version = os.getenv("LD_AI_IMAGE_VERSION", "").strip()
    if env_version:
        return env_version
    try:
        if os.path.exists(IMAGE_VERSION_FILE):
            with open(IMAGE_VERSION_FILE, "r", encoding="utf-8") as f:
                return f.read().strip()
    except Exception:
        pass
    return ""


def get_hardware_fingerprint():
    components = collect_hardware_components()
    if not components:
        components = [DEVICE_SN]
    seed = "|".join(components)
    return hashlib.sha256(seed.encode("utf-8")).hexdigest().upper()


def iso_now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def load_status():
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "sn": DEVICE_SN,
        "bindCode": generate_bind_code(DEVICE_SN),
        "agentVersion": AGENT_VERSION,
        "cloudUrl": CLOUD_URL,
        "ollamaUrl": OLLAMA_URL,
        "bootTime": iso_now(),
        "online": False,
        "lastHeartbeatTime": "",
        "lastError": "INIT",
        "ip": "127.0.0.1",
        "cpuLoad": 0,
        "memLoad": 0,
        "cpuModel": "",
        "currentTask": "IDLE",
        "lastTaskStatus": "WAITING",
        "lastTaskId": "",
        "lastTaskType": "",
        "lastResultAt": "",
        "logs": [],
    }


STATUS = load_status()
STATUS_LOCK = threading.RLock()
REMOTE_COMMAND_LOCK = threading.Lock()
REMOTE_COMMANDS_RUNNING = set()


def persist_status():
    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    with STATUS_LOCK:
        with open(STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(STATUS, f, ensure_ascii=False, indent=2)


def push_log(message):
    with STATUS_LOCK:
        line = f"{iso_now()}  {message}"
        logs = STATUS.setdefault("logs", [])
        logs.append(line)
        if len(logs) > MAX_LOG_LINES:
            del logs[:-MAX_LOG_LINES]
        persist_status()


def get_cpu_model():
    try:
        with open("/proc/cpuinfo", "r", encoding="utf-8") as f:
            for line in f:
                if line.lower().startswith("model name"):
                    return line.split(":", 1)[1].strip()
    except Exception:
        pass

    try:
        output = subprocess.check_output(["lscpu"], text=True, timeout=3)
        for line in output.splitlines():
            if "Model name:" in line:
                return line.split(":", 1)[1].strip()
    except Exception:
        pass

    cpu_name = platform.processor()
    return cpu_name if cpu_name else "Unknown CPU"


def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def report_status():
    global HEARTBEAT_INTERVAL, TASK_POLL_INTERVAL

    url = f"{CLOUD_URL}/api/edge/report"
    ip = get_ip()
    cpu_load = psutil.cpu_percent()
    mem_load = psutil.virtual_memory().percent
    cpu_model = get_cpu_model()
    image_version = load_image_version()
    hardware_fingerprint = get_hardware_fingerprint()

    payload = {
        "sn": DEVICE_SN,
        "ip": ip,
        "cpu_load": cpu_load,
        "mem_load": mem_load,
        "cpu_model": cpu_model,
        "agent_version": AGENT_VERSION,
        "image_version": image_version,
        "hardware_fingerprint": hardware_fingerprint,
        "status": 1,
    }
    with STATUS_LOCK:
        STATUS.update({
            "sn": DEVICE_SN,
            "bindCode": generate_bind_code(DEVICE_SN),
            "agentVersion": AGENT_VERSION,
            "cloudUrl": CLOUD_URL,
            "ollamaUrl": OLLAMA_URL,
            "ip": ip,
            "cpuLoad": round(cpu_load, 1),
            "memLoad": round(mem_load, 1),
            "cpuModel": cpu_model,
            "imageVersion": image_version,
        })
    try:
        res = requests.post(url, json=payload, timeout=5)
        data = res.json()
        with STATUS_LOCK:
            STATUS["online"] = data.get("code") == 200
            STATUS["lastHeartbeatTime"] = iso_now()
        if data.get("code") == 200:
            with STATUS_LOCK:
                STATUS["lastError"] = "CONNECTED"
            # 动态更新心跳间隔（服务端下发）
            server_interval = data.get("data", {}).get("heartbeatInterval")
            if server_interval and isinstance(server_interval, (int, float)) and server_interval >= 5:
                HEARTBEAT_INTERVAL = int(server_interval)
            # 动态更新任务轮询间隔（服务端下发）
            server_task_interval = data.get("data", {}).get("taskPollInterval")
            if server_task_interval and isinstance(server_task_interval, (int, float)) and server_task_interval >= 5:
                TASK_POLL_INTERVAL = int(server_task_interval)
            action = data.get("data", {}).get("action")
            if action == "execute_command":
                command = data["data"].get("command", "")
                command_no = data["data"].get("commandNo", "")
                if command:
                    start_remote_command(command, command_no)
        else:
            with STATUS_LOCK:
                STATUS["lastError"] = data.get("msg", "UNAUTHORIZED")
        persist_status()
    except Exception as e:
        with STATUS_LOCK:
            STATUS["online"] = False
            STATUS["lastError"] = str(e)
            STATUS["lastHeartbeatTime"] = iso_now()
        push_log(f"HEARTBEAT ERROR -> {e}")
        print(f"[HEARTBEAT ERR] {e}")


def start_remote_command(command, command_no=""):
    command_key = command_no or command
    with REMOTE_COMMAND_LOCK:
        if command_key in REMOTE_COMMANDS_RUNNING:
            push_log(f"REMOTE CMD SKIPPED DUPLICATE -> {command_key}")
            return
        REMOTE_COMMANDS_RUNNING.add(command_key)

    def runner():
        try:
            execute_remote_command(command, command_no)
        finally:
            with REMOTE_COMMAND_LOCK:
                REMOTE_COMMANDS_RUNNING.discard(command_key)

    threading.Thread(target=runner, name="ld-ai-remote-command", daemon=True).start()


def execute_remote_command(command, command_no=""):
    push_log(f"REMOTE CMD -> {command}")
    exit_code = 1
    output = ""
    try:
        completed = subprocess.run(
            command,
            shell=True,
            text=True,
            capture_output=True,
            timeout=120,
        )
        exit_code = completed.returncode
        output = ((completed.stdout or "") + (completed.stderr or "")).strip()
        push_log(f"REMOTE CMD DONE -> code={exit_code}")
    except subprocess.TimeoutExpired as e:
        exit_code = 124
        output = f"Command timeout: {e}"
        push_log("REMOTE CMD TIMEOUT")
    except Exception as e:
        output = str(e)
        push_log(f"REMOTE CMD ERROR -> {e}")

    if command_no:
        try:
            requests.post(
                f"{CLOUD_URL}/api/edge/commands/submit",
                json={
                    "sn": DEVICE_SN,
                    "commandNo": command_no,
                    "exitCode": exit_code,
                    "resultText": output[-4000:],
                },
                timeout=5,
            )
        except Exception as e:
            push_log(f"CMD RESULT SUBMIT ERROR -> {e}")


def fetch_task():
    url = f"{CLOUD_URL}/api/edge/tasks/fetch"
    try:
        res = requests.get(url, params={"sn": DEVICE_SN}, timeout=5)
        data = res.json()
        if data.get("code") == 200 and data.get("data"):
            task_id = str(data["data"].get("id", ""))
            task_type = data["data"].get("taskType", "")
            with STATUS_LOCK:
                STATUS["currentTask"] = "RUNNING"
                STATUS["lastTaskId"] = task_id
                STATUS["lastTaskType"] = task_type
            push_log(f"TASK FETCHED -> id={task_id} type={task_type}")
            return data["data"]
    except Exception as e:
        push_log(f"FETCH ERROR -> {e}")
        print(f"[FETCH ERROR] {e}")
    return None


def execute_task(task):
    task_id = task.get("id")
    task_type = task.get("taskType", "ollama")
    with STATUS_LOCK:
        STATUS["currentTask"] = f"RUNNING {task_type}"
    print(f"[TASK RECEIVED] id={task_id} type={task_type}")

    start_time = time.time()
    result_data = {
        "id": task_id,
        "status": "completed",
        "generateTokens": 0,
        "responseText": "",
    }

    try:
        if task_type == "ollama":
            payload = {
                "model": task.get("modelName", "qwen2.5:7b"),
                "prompt": task.get("prompt", ""),
                "stream": False,
            }
            res = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=300)
            res_json = res.json()
            result_data["responseText"] = res_json.get("response", "")
            result_data["generateTokens"] = res_json.get("eval_count", 0)
        elif task_type == "python_script":
            code = task.get("taskParams", "")
            local_vars = {}
            exec(code, {"requests": requests, "json": json, "time": time}, local_vars)
            output = local_vars.get("output", "Success (No output variable)")
            result_data["responseText"] = str(output)
            result_data["generateTokens"] = len(result_data["responseText"])
        elif task_type == "spider":
            params = json.loads(task.get("taskParams", "{}"))
            target_url = params.get("url")
            res = requests.get(target_url, timeout=30)
            result_data["responseText"] = res.text[:2000]
            result_data["generateTokens"] = len(result_data["responseText"])
        else:
            result_data["status"] = "failed"
            result_data["errorMsg"] = f"Unsupported task type: {task_type}"
    except Exception as e:
        result_data["status"] = "failed"
        result_data["errorMsg"] = str(e)

    result_data["durationMs"] = int((time.time() - start_time) * 1000)
    last_task_id = str(task_id or "")
    with STATUS_LOCK:
        STATUS["lastTaskStatus"] = result_data["status"].upper()
        STATUS["lastTaskId"] = last_task_id
        STATUS["lastTaskType"] = task_type
        STATUS["lastResultAt"] = iso_now()
        STATUS["currentTask"] = "IDLE"
    push_log(
        f"TASK {result_data['status'].upper()} -> id={last_task_id} "
        f"type={task_type} tokens={result_data.get('generateTokens', 0)} "
        f"duration={result_data['durationMs']}ms"
    )
    return result_data


def submit_result(result):
    url = f"{CLOUD_URL}/api/edge/tasks/submit"
    try:
        res = requests.post(url, json=result, timeout=10)
        push_log(f"RESULT SUBMITTED -> id={result.get('id')} status={result.get('status')}")
        print(f"[SUBMIT] {res.json().get('msg')}")
    except Exception as e:
        push_log(f"SUBMIT ERROR -> {e}")
        print(f"[SUBMIT ERR] {e}")


def heartbeat_loop(stop_event):
    while not stop_event.is_set():
        report_status()
        if stop_event.wait(max(5, int(HEARTBEAT_INTERVAL))):
            break


def main():
    print(f"LD AI Edge Agent start: {DEVICE_SN} version={AGENT_VERSION}")
    push_log("AGENT STARTED")
    stop_event = threading.Event()
    heartbeat_thread = threading.Thread(
        target=heartbeat_loop,
        args=(stop_event,),
        name="ld-ai-heartbeat",
        daemon=True,
    )
    heartbeat_thread.start()

    try:
        while not stop_event.is_set():
            task = fetch_task()
            if task:
                result = execute_task(task)
                submit_result(result)

            stop_event.wait(max(5, int(TASK_POLL_INTERVAL)))
    except KeyboardInterrupt:
        stop_event.set()
        push_log("AGENT STOPPED")


if __name__ == "__main__":
    main()
