#!/bin/bash

set -euo pipefail

ACTION="${1:-status}"
LOCAL_PORT="${2:-1080}"
REMOTE_PORT="${3:-${LD_AI_TUNNEL_REMOTE_PORT:-0}}"
TUNNEL_HOST="${LD_AI_TUNNEL_HOST:-hz.shandongliandong.com}"
TUNNEL_USER="${LD_AI_TUNNEL_USER:-tunnel}"
SSH_KEY="${LD_AI_TUNNEL_KEY:-/opt/ld-ai/tunnel_key}"
PID_FILE="/opt/ld-ai/runtime/tunnel.pid"
LOG_FILE="/opt/ld-ai/runtime/tunnel.log"

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

start_tunnel() {
  if [ "$REMOTE_PORT" = "0" ]; then
    echo "remote port is required; set LD_AI_TUNNEL_REMOTE_PORT or pass as third argument" >&2
    exit 2
  fi
  if ! command -v ssh >/dev/null 2>&1; then
    echo "missing ssh client" >&2
    exit 127
  fi
  if is_running; then
    echo "ld-ai tunnel already running pid=$(cat "$PID_FILE") remote_port=$REMOTE_PORT"
    exit 0
  fi

  nohup ssh \
    -N \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -o StrictHostKeyChecking=no \
    -i "$SSH_KEY" \
    -R "0.0.0.0:${REMOTE_PORT}:127.0.0.1:${LOCAL_PORT}" \
    "${TUNNEL_USER}@${TUNNEL_HOST}" >>"$LOG_FILE" 2>&1 &

  echo $! > "$PID_FILE"
  sleep 2
  if is_running; then
    echo "ld-ai tunnel started pid=$(cat "$PID_FILE") remote=${TUNNEL_HOST}:${REMOTE_PORT} local=127.0.0.1:${LOCAL_PORT}"
  else
    echo "ld-ai tunnel failed to start" >&2
    exit 1
  fi
}

stop_tunnel() {
  if is_running; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "ld-ai tunnel stopped"
  else
    rm -f "$PID_FILE"
    echo "ld-ai tunnel not running"
  fi
}

case "$ACTION" in
  start)
    start_tunnel
    ;;
  stop)
    stop_tunnel
    ;;
  restart)
    stop_tunnel
    start_tunnel
    ;;
  status)
    if is_running; then
      echo "ld-ai tunnel running pid=$(cat "$PID_FILE")"
    else
      echo "ld-ai tunnel stopped"
      exit 3
    fi
    ;;
  *)
    echo "usage: $0 {start|stop|restart|status} [local_port] [remote_port]" >&2
    exit 2
    ;;
esac
