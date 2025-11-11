#!/usr/bin/env bash

set -euo pipefail

# Resolve the project directory (where this script lives)
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Prefer Homebrew node on macOS if present
HOMEBREW_NODE="/opt/homebrew/bin/node"

if [ -x "$HOMEBREW_NODE" ]; then
  NODE_BIN="$HOMEBREW_NODE"
else
  # Fallback to whatever "node" is on PATH
  NODE_BIN="$(command -v node || true)"
fi

if [ -z "${NODE_BIN:-}" ]; then
  echo "Error: Node.js not found on PATH or at /opt/homebrew/bin/node" >&2
  exit 1
fi

echo "Using Node at: $NODE_BIN"
echo "Project directory: $PROJECT_DIR"

# Optional: set production environment by default
export NODE_ENV="${NODE_ENV:-production}"

# Exec replaces the shell with node, so signals (SIGINT, SIGTERM) propagate correctly
exec "$NODE_BIN" "$PROJECT_DIR/src/main.js"
