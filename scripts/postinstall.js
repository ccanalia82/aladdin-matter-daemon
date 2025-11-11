// scripts/postinstall.js
// Ensure start-matter.sh is executable on POSIX systems.
// On Windows this will just log and exit without failing.

const fs = require("fs");
const path = require("path");

const scriptPath = path.join(__dirname, "..", "start-matter.sh");

fs.stat(scriptPath, (err, stats) => {
  if (err) {
    console.warn(`[postinstall] start-matter.sh not found at ${scriptPath}`);
    return;
  }

  // If not a file, don't try to chmod
  if (!stats.isFile()) {
    console.warn("[postinstall] start-matter.sh exists but is not a regular file.");
    return;
  }

  // On Windows, chmod doesn't really matter, but fs.chmod won't hurt.
  fs.chmod(scriptPath, 0o755, (chmodErr) => {
    if (chmodErr) {
      console.warn(
        `[postinstall] Could not set executable bit on start-matter.sh: ${chmodErr.message}`
      );
    } else {
      console.log("[postinstall] Ensured start-matter.sh is executable (755).");
    }
  });
});
