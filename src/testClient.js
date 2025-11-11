// src/testClient.js
// Simple CLI helper to smoke-test Genie connectivity without Matter.
//
// Usage:
//   export GENIE_USER="you@example.com"
//   export GENIE_PASS="your-password"
//   node src/testClient.js

const { AladdinClient } = require("./aladdinClient");

const client = new AladdinClient({
  username: process.env.GENIE_USER,
  password: process.env.GENIE_PASS,
  debug: true,
  logPrefix: "TestClient",
});

(async () => {
  try {
    const status = await client.getStatus();
    console.log("Garage Door Status:", status);
  } catch (err) {
    console.error("Error while calling Genie:", err);
  }
})();
