#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG_DIR="$SCRIPT_DIR/jx-agent-package"
PKG_NAME="jx-agent-linux.tar.gz"

rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR"

cp "$SCRIPT_DIR/agent.py" "$PKG_DIR/agent.py"
cp "$SCRIPT_DIR/ui.py" "$PKG_DIR/ui.py"
cp "$SCRIPT_DIR/terminal-agent.py" "$PKG_DIR/terminal-agent.py"
cp "$SCRIPT_DIR/proxy-control.sh" "$PKG_DIR/proxy-control.sh"
cp "$SCRIPT_DIR/tunnel-control.sh" "$PKG_DIR/tunnel-control.sh"
cp "$SCRIPT_DIR/install_agent.sh" "$PKG_DIR/install_agent.sh"

chmod 755 "$PKG_DIR/install_agent.sh"
chmod 755 "$PKG_DIR/proxy-control.sh"
chmod 755 "$PKG_DIR/tunnel-control.sh"

tar -czf "$SCRIPT_DIR/$PKG_NAME" -C "$PKG_DIR" .

echo "package ready: $SCRIPT_DIR/$PKG_NAME"
