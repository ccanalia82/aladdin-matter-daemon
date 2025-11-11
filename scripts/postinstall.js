/**
 * postinstall.js
 *
 * This script runs automatically after `npm install` completes.
 * Its purpose is to ensure that `start-matter.sh` (the startup script)
 * has the correct execute permissions (chmod 755) on macOS/Linux.
 *
 * On Windows, this will fail silently since chmod has no effect there.
 * That’s OK — the script will still print a warning but not block installation.
 */

const fs = require("fs");
const path = require("path");

// Resolve the absolute path to the start-matter.sh script
const file = path.resolve(__dirname, "../start-matter.sh");

try {
  // chmodSync sets the file permissions to 755 (-rwxr-xr-x)
  // meaning: Owner can read/write/execute; others can read/execute
  fs.chmodSync(file, 0o755);

  // Log confirmation so the user knows it succeeded
  console.log("[postinstall] Ensured start-matter.sh is executable (755).");
} catch (err) {
  // This usually happens on Windows or restricted environments.
  // We catch it to avoid breaking npm install.
  console.warn("[postinstall] Could not chmod start-matter.sh:", err.message);
}
