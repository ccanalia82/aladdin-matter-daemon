#!/bin/bash
# start-matter.sh
#
# Small helper script to launch the Matter daemon with the "best" Node:
# - On Apple Silicon, prefer /opt/homebrew/bin/node (Homebrew installation)
# - Otherwise, fall back to whatever `which node` finds on PATH.
#
# This script is chmod'ed to 755 by scripts/postinstall.js so the user can
# run it directly.

set -e

# Prefer Homebrew's Node on macOS ARM if available.
if command -v /opt/homebrew/bin/node >/dev/null 2>&1; then
  NODE_BIN="/opt/homebrew/bin/node"
else
  NODE_BIN="$(command -v node)"
fi

if [ -z "$NODE_BIN" ]; then
  echo "Error: Node.js not found. Please install Node 20+."
  exit 1
fi

echo "Using Node at: $NODE_BIN"

# Resolve project directory to this script's directory.
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Exec so signals (Ctrl+C, systemd stop, etc.) flow to Node correctly.
exec "$NODE_BIN" src/main.js
