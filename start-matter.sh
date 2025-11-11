#!/bin/bash
###############################################################################
# start-matter.sh
#
# Universal launcher script for the Aladdin Matter Daemon.
# This script detects and executes the correct Node.js binary for macOS,
# Linux, or Homebridge environments. It ensures the Matter.js server
# starts cleanly with OS-level signal handling and consistent behavior.
#
# Usage:
#   ./start-matter.sh
#
# Requirements:
#   - Node.js v20 or later
#   - Properly configured config.genie.json or environment variables
###############################################################################

# Exit immediately if any command fails
set -e

# ---------------------------------------------------------------------------
# Detect Node.js binary
# ---------------------------------------------------------------------------
# Try the typical macOS Homebrew path first, then fall back to PATH lookup.
# This ensures compatibility for both Apple Silicon and Linux systems.
if command -v /opt/homebrew/bin/node >/dev/null 2>&1; then
  NODE_BIN="/opt/homebrew/bin/node"
else
  NODE_BIN="$(command -v node)"
fi

# ---------------------------------------------------------------------------
# Validate Node.js availability
# ---------------------------------------------------------------------------
# If no valid Node binary is found, display an error and abort.
if [ -z "$NODE_BIN" ]; then
  echo "Error: Node.js not found. Please install Node 20+ and retry."
  exit 1
fi

echo "Using Node at: $NODE_BIN"

# ---------------------------------------------------------------------------
# Change to project directory
# ---------------------------------------------------------------------------
# Resolve the directory this script resides in to handle relative paths.
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# ---------------------------------------------------------------------------
# Start the Matter daemon
# ---------------------------------------------------------------------------
# Run the Matter.js daemon (src/main.js) under the detected Node binary.
# The `exec` replaces the current shell so signals (Ctrl+C, SIGTERM)
# propagate cleanly to Node for graceful shutdown.
exec "$NODE_BIN" src/main.js
