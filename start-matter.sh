#!/bin/bash
# start-matter.sh

set -e

# Detect Node binary
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
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

exec "$NODE_BIN" src/main.js
