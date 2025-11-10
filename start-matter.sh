#!/usr/bin/env bash

# Resolve the project directory (where this script lives)
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Switch to /opt/homebrew as you requested
cd /opt/homebrew

# Run the Matter daemon using the project path
node "$PROJECT_DIR/src/main.js"
