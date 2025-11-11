/**
 * postinstall.js
 *
 * Runs automatically after `npm install` completes.
 * Ensures `start-matter.sh` is executable (chmod 755) on macOS/Linux.
 *
 * On Windows, this step is skipped automatically, since chmod
 * has no effect there. The script will still log a message and exit cleanly.
 */

const fs = require("fs");
const path = require("path");

// -----------------------------------------------------------------------------
// Resolve the absolute path to the startup script
// -----------------------------------------------------------------------------
const file = path.resolve(__dirname, "../start-matter.sh");

// -----------------------------------------------------------------------------
// Skip chmod on Windows (no executable permissions system there)
// -----------------------------------------------------------------------------
if (process.platform === "win32") {
  console.log("[postinstall] Detected Windows OS — skipping chmod step.");
  process.exit(0);
}

// -----------------------------------------------------------------------------
// Verify that the file exists before attempting chmod
// -----------------------------------------------------------------------------
if (!fs.existsSync(file)) {
  console.warn("[postinstall] Warning: start-matter.sh not found. Skipping chmod.");
  process.exit(0);
}

// -----------------------------------------------------------------------------
// Attempt to set executable permissions (755 = -rwxr-xr-x)
// -----------------------------------------------------------------------------
try {
  fs.chmodSync(file, 0o755);
  console.log("[postinstall] Ensured start-matter.sh is executable (755).");
} catch (err) {
  // Catch permission or filesystem errors (e.g., read-only directory)
  console.warn("[postinstall] Could not chmod start-matter.sh:", err.message);
  process.exit(0);
}
