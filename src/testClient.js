/**
 * testClient.js
 *
 * A simple standalone diagnostic script to verify Genie API connectivity
 * and authentication outside of the full Matter/Homebridge environment.
 *
 * Usage:
 *   1. Set environment variables for your Genie account:
 *        export GENIE_USER="you@example.com"
 *        export GENIE_PASS="your_password"
 *
 *   2. Run the script directly:
 *        node src/testClient.js
 *
 * This will authenticate to the Genie cloud, request the door status,
 * and print the raw response to stdout. Useful for debugging credentials,
 * firewall issues, or Genie API outages.
 */

const { AladdinClient } = require("./aladdinClient");

// Initialize the client with credentials from environment variables.
// Never hard-code secrets directly into source code.
const client = new AladdinClient({
  username: process.env.GENIE_USER,
  password: process.env.GENIE_PASS,
  debug: true, // Enable verbose logging for troubleshooting
});

// Immediately-invoked async function expression (IIFE) so we can use await
(async () => {
  try {
    // Fetch the current door status from Genie
    const status = await client.getStatus();

    // Log the raw response for developer inspection
    console.log("Garage Door Status:", status);
  } catch (e) {
    // Print any error that occurred during the API call
    console.error("Error retrieving Genie door status:", e.message || e);
  }
})();
