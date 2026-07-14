import os
import requests
import json
import time
import uuid
import psutil
import socket

# ================= 配置区 =================
CLOUD_URL = "https://api.hz.shandongliandong.com"
OLLAMA_URL = "http://127.0.0.1:11434"
# 每个节点的唯一识别码，可以手动写，或者根据 MAC 地址自动生成
DEVICE_SN = "LD-AGENT-" + str(uuid.uuid4())[:8].upper()
HEARTBEAT_INTERVAL = 10 # 秒
TASK_POLL_INTERVAL = 5 # 秒

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def report_status():
    """上报心跳状态"""
    url = f"{CLOUD_URL}/api/edge/report"
    payload = {
        "sn": DEVICE_SN,
        "ip": get_ip(),
        "cpu_load": psutil.cpu_percent(),
        "mem_load": psutil.virtual_memory().percent,
        "status": 1
    }
    try:
        res = requests.post(url, json=payload, timeout=5)
        data = res.json()
        if data.get("code") == 200:
            action = data.get("data", {}).get("action")
            if action == "execute_command":
                print(f"[RECV COMMAND] {data['data']['command']}")
                os.system(data['data']['command'])
    except Exception as e:
        print(f"[HEARTBEAT ERR] {e}")

def fetch_task():
    """领取任务"""
    url = f"{CLOUD_URL}/api/edge/tasks/fetch?sn={DEVICE_SN}"
    try:
        res = requests.get(url, timeout=5)
        data = res.json()
        if data.get("code") == 200 and data.get("data"):
            return data["data"]
    except Exception as e:
        print(f"[FETCH ERROR] {e}")
    return None

def execute_task(task):
    """任务执行路由中心"""
    task_id = task.get('id')
    task_type = task.get('taskType', 'ollama')
    print(f"🚀 [TASK RECEIVED] ID: {task_id} | Type: {task_type}")
    
    start_time = time.time()
    result_data = {
        "id": task_id,
        "status": "completed",
        "generateTokens": 0,
        "responseText": ""
    }

    try:
        if task_type == 'ollama':
            # Ollama 推理逻辑
            url = f"{OLLAMA_URL}/api/generate"
            payload = {
                "model": task.get("modelName", "qwen2.5:7b"),
                "prompt": task.get("prompt", ""),
                "stream": False
            }
            res = requests.post(url, json=payload, timeout=300)
            res_json = res.json()
            result_data["responseText"] = res_json.get("response", "")
            result_data["generateTokens"] = res_json.get("eval_count", 0)

        elif task_type == 'python_script':
            # 代码注入逻辑：执行传入的 Python 代码
            code = task.get("taskParams", "")
            print(f"Executing injected python code...")
            # 创建局部作用域执行代码
            local_vars = {}
            exec(code, {"requests": requests, "json": json, "time": time}, local_vars)
            result_data["responseText"] = str(local_vars.get("output", "Success (No output variable)"))
            result_data["generateTokens"] = len(result_data["responseText"])

        elif task_type == 'spider':
            # 简易爬虫逻辑示例
            params = json.loads(task.get("taskParams", "{}"))
            target_url = params.get("url")
            print(f"Scraping {target_url}...")
            res = requests.get(target_url, timeout=30)
            result_data["responseText"] = res.text[:2000] # 截断防止过长
            result_data["generateTokens"] = len(result_data["responseText"])

        else:
            result_data["status"] = "failed"
            result_data["errorMsg"] = f"Unsupported task type: {task_type}"

    except Exception as e:
        print(f"❌ 任务执行失败: {e}")
        result_data["status"] = "failed"
        result_data["errorMsg"] = str(e)
    
    result_data["durationMs"] = int((time.time() - start_time) * 1000)
    return result_data

def submit_result(result):
    """回传结果"""
    url = f"{CLOUD_URL}/api/edge/tasks/submit"
    try:
        res = requests.post(url, json=result, timeout=10)
        print(f"✅ 结果上报成功: {res.json().get('msg')}")
    except Exception as e:
        print(f"❌ 上报结果失败: {e}")

def main():
    print(f"--- JX AI Edge Agent [{DEVICE_SN}] Starting ---")
    last_heartbeat = 0
    
    while True:
        now = time.time()
        
        # 1. 定时上报心跳
        if now - last_heartbeat > HEARTBEAT_INTERVAL:
            report_status()
            last_heartbeat = now
            
        # 2. 拉取并执行任务
        task = fetch_task()
        if task:
            result = execute_task(task)
            submit_result(result)
            
        time.sleep(TASK_POLL_INTERVAL)

if __name__ == "__main__":
    main()
