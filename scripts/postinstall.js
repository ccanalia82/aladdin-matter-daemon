// scripts/postinstall.js
const fs = require("fs");
const path = require("path");

const file = path.resolve(__dirname, "../start-matter.sh");

try {
  fs.chmodSync(file, 0o755);
  console.log("[postinstall] Ensured start-matter.sh is executable (755).");
} catch (err) {
  console.warn("[postinstall] Could not chmod start-matter.sh:", err.message);
}
