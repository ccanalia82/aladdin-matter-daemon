#!/usr/bin/env bash

# Resolve project directory
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Ensure correct homebrew path on macOS
cd /opt/homebrew

# Start the Matter daemon
node "$PROJECT_DIR/src/main.js"
