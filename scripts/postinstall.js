// scripts/postinstall.js
// Developer note:
// This script runs automatically after `npm install`.
// It ensures `start-matter.sh` is executable on POSIX systems so users
// can run it directly without manually setting chmod.

const fs = require("fs");
const path = require("path");

// Resolve the shell script path relative to this file.
const file = path.resolve(__dirname, "../start-matter.sh");

try {
  // 0o755 => -rwxr-xr-x
  fs.chmodSync(file, 0o755);
  console.log("[postinstall] Ensured start-matter.sh is executable (755).");
} catch (err) {
  // Non-fatal: on Windows this will typically fail, but that's OK.
  console.warn("[postinstall] Could not chmod start-matter.sh:", err.message);
}
