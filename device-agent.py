import os
import sys
import pty
import fcntl
import termios
import struct
import select
import websocket
import threading
import time
import json

# 配置区域
# 请在此处填写服务器地址和设备 SN
SERVER_URL = "ws://your-server-ip:8080/ws/device/"
DEVICE_SN = "TEST_DEVICE_01"

class DeviceAgent:
    def __init__(self, server_url, sn):
        self.server_url = server_url + sn
        self.sn = sn
        self.ws = None
        self.master_fd = None
        self.shell_pid = None

    def start_shell(self):
        if self.master_fd is not None:
            return
        
        # 创建伪终端
        pid, fd = pty.fork()
        
        if pid == 0:  # 子进程
            # 执行 bash
            os.execv('/bin/bash', ['/bin/bash'])
        else:  # 父进程
            self.shell_pid = pid
            self.master_fd = fd
            print(f"Shell started with PID: {pid}")
            
            # 设置非阻塞
            attr = termios.tcgetattr(self.master_fd)
            attr[3] = attr[3] & ~termios.ECHO # 关闭回显（由 shell 处理）
            
            # 启动监听线程
            threading.Thread(target=self.pipe_output_to_ws, daemon=True).start()

    def pipe_output_to_ws(self):
        while self.master_fd is not None:
            try:
                # 检查 fd 是否就绪
                r, w, e = select.select([self.master_fd], [], [], 0.1)
                if r:
                    data = os.read(self.master_fd, 1024)
                    if data and self.ws and self.ws.sock and self.ws.sock.connected:
                        self.ws.send(data.decode('utf-8', errors='replace'))
            except Exception as e:
                print(f"Pipe error: {e}")
                break

    def on_message(self, ws, message):
        if message == "INIT_SHELL":
            print("Received INIT_SHELL")
            self.start_shell()
        else:
            if self.master_fd is not None:
                try:
                    os.write(self.master_fd, message.encode('utf-8'))
                except Exception as e:
                    print(f"Write to shell error: {e}")

    def on_error(self, ws, error):
        print(f"WS Error: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        print("WS Closed")
        self.ws = None

    def on_open(self, ws):
        print("Successfully connected to server")
        self.ws = ws

    def run(self):
        while True:
            try:
                print(f"Connecting to {self.server_url}...")
                self.ws = websocket.WebSocketApp(
                    self.server_url,
                    on_open=self.on_open,
                    on_message=self.on_message,
                    on_error=self.on_error,
                    on_close=self.on_close
                )
                self.ws.run_forever()
            except Exception as e:
                print(f"Run error: {e}")
            
            print("Retrying in 5 seconds...")
            time.sleep(5)

if __name__ == "__main__":
    # 获取本机 SN (示例：从文件读取或通过命令获取)
    # sn = os.popen("cat /proc/cpuinfo | grep Serial | cut -d ':' -f 2").read().strip()
    agent = DeviceAgent(SERVER_URL, DEVICE_SN)
    agent.run()
