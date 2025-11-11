/**
 * genieApi.js
 *
 * This module provides a lightweight interface to the Genie Aladdin Connect
 * cloud API. It handles authentication and individual device actions
 * (status, open, close, battery) using Node's native `fetch()` API.
 *
 * The code intentionally avoids deprecated libraries like `request` or
 * `request-promise-native` and uses async/await for modern readability.
 *
 * Author: Chris Canalia
 * License: MIT
 */

// Base API endpoint — may vary if Genie updates their cloud URLs.
// To verify, inspect network calls from the official Genie mobile app.
const BASE_URL = "https://geniecompany.com/api";

/**
 * Authenticate with the Genie API.
 *
 * @param {string} username - Genie account email
 * @param {string} password - Genie account password
 * @param {boolean} [debug=false] - Enables verbose console output
 * @returns {Promise<string>} A valid access token string
 */
async function login(username, password, debug = false) {
  const url = `${BASE_URL}/v1/login`;

  if (debug) {
    console.log(`[GenieAPI] Logging in at ${url}`);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  // If Genie’s API rejects credentials, provide a clear error message.
  if (!res.ok) {
    throw new Error(`[GenieAPI] Login failed with status ${res.status}`);
  }

  // Parse JSON; different Genie endpoints may return token under different keys.
  const data = await res.json();
  const token = data.token || data.accessToken || data.idToken;

  if (!token) {
    throw new Error("[GenieAPI] No access token returned from login response.");
  }

  if (debug) {
    console.log("[GenieAPI] Login successful; token acquired.");
  }

  return token;
}

/**
 * Call a Genie API endpoint for a specific garage door action.
 *
 * @param {Object} options
 * @param {string} options.username - Genie account email
 * @param {string} options.password - Genie account password
 * @param {"status"|"battery"|"open"|"close"} options.action - Desired action
 * @param {number} [options.deviceNumber=0] - Device index in Genie account
 * @param {number} [options.garageNumber=1] - Garage number under the device
 * @param {boolean} [options.debug=false] - Enables verbose output
 * @returns {Promise<Object>} JSON response from Genie API
 */
async function callGenie({
  username,
  password,
  action,
  deviceNumber = 0,
  garageNumber = 1,
  debug = false,
}) {
  // First, authenticate to obtain a fresh bearer token.
  const token = await login(username, password, debug);

  // Construct the endpoint path dynamically based on action.
  let endpoint = `${BASE_URL}/v1/devices/${deviceNumber}/garages/${garageNumber}`;
  let method = "GET";

  switch (action) {
    case "status":
      endpoint += "/status";
      break;
    case "battery":
      endpoint += "/battery";
      break;
    case "open":
      endpoint += "/open";
      method = "POST";
      break;
    case "close":
      endpoint += "/close";
      method = "POST";
      break;
    default:
      throw new Error(`[GenieAPI] Invalid action: ${action}`);
  }

  if (debug) {
    console.log(`[GenieAPI] Calling ${method} ${endpoint}`);
  }

  // Execute the HTTP request with bearer token authorization.
  const res = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`[GenieAPI] ${action} failed with status ${res.status}`);
  }

  // Attempt to parse response JSON; default to {} if body is empty.
  const data = await res.json().catch(() => ({}));

  if (debug) {
    console.log(`[GenieAPI] ${action} response:`, data);
  }

  return data;
}

// Export only the public function; login() remains internal.
module.exports = { callGenie };
