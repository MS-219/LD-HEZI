#!/bin/bash

set -euo pipefail

ACTION="${1:-status}"
LOCAL_PORT="${2:-1080}"
PID_FILE="/opt/ld-ai/runtime/proxy.pid"
LOG_FILE="/opt/ld-ai/runtime/proxy.log"

mkdir -p /opt/ld-ai/runtime

is_running() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

start_proxy() {
  if is_running; then
    echo "ld-ai proxy already running pid=$(cat "$PID_FILE") port=$LOCAL_PORT"
    exit 0
  fi

  if command -v gost >/dev/null 2>&1; then
    nohup gost -L "socks5://0.0.0.0:${LOCAL_PORT}" >>"$LOG_FILE" 2>&1 &
  elif command -v microsocks >/dev/null 2>&1; then
    nohup microsocks -i 0.0.0.0 -p "$LOCAL_PORT" >>"$LOG_FILE" 2>&1 &
  else
    echo "missing proxy binary: install gost or microsocks" >&2
    exit 127
  fi

  echo $! > "$PID_FILE"
  sleep 1
  if is_running; then
    echo "ld-ai proxy started pid=$(cat "$PID_FILE") port=$LOCAL_PORT"
  else
    echo "ld-ai proxy failed to start" >&2
    exit 1
  fi
}

stop_proxy() {
  if is_running; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "ld-ai proxy stopped"
  else
    rm -f "$PID_FILE"
    echo "ld-ai proxy not running"
  fi
}

case "$ACTION" in
  start)
    start_proxy
    ;;
  stop)
    stop_proxy
    ;;
  restart)
    stop_proxy
    start_proxy
    ;;
  status)
    if is_running; then
      echo "ld-ai proxy running pid=$(cat "$PID_FILE")"
    else
      echo "ld-ai proxy stopped"
      exit 3
    fi
    ;;
  *)
    echo "usage: $0 {start|stop|restart|status} [local_port]" >&2
    exit 2
    ;;
esac
