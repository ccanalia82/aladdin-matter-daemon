// src/genieApi.js
// Low-level HTTP client for the Genie Aladdin Connect cloud.
// This replaces node-aladdin-connect-garage-door with a modern
// fetch()-based implementation and a much smaller dependency surface.

const BASE_URL = "https://geniecompany.com/api"; // TODO: adjust to actual Genie API base if needed

/**
 * Log in to Genie and return an access token.
 */
async function login(username, password, debug = false, logPrefix = "GenieAPI") {
  const url = `${BASE_URL}/v1/login`;

  if (debug) {
    console.log(`[${logPrefix}] Logging in to Genie at ${url}...`);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `[${logPrefix}] Login failed with status ${res.status}: ${text}`
    );
  }

  const data = await res.json();
  const token = data.token || data.accessToken || data.idToken;

  if (!token) {
    throw new Error(`[${logPrefix}] Login response did not include a token`);
  }

  if (debug) {
    console.log(`[${logPrefix}] Login successful, token acquired.`);
  }

  return token;
}

/**
 * Perform a Genie action (status, battery, open, close).
 * Returns the parsed JSON response (or {} on empty body).
 */
async function callGenie({
  username,
  password,
  action,
  deviceNumber = 0,
  garageNumber = 1,
  debug = false,
  logPrefix = "GenieAPI",
}) {
  if (!username || !password) {
    throw new Error(`[${logPrefix}] Username and password are required.`);
  }

  if (!action) {
    throw new Error(`[${logPrefix}] Action is required.`);
  }

  const token = await login(username, password, debug, logPrefix);

  let endpoint = `${BASE_URL}/v1/devices/${deviceNumber}/garages/${garageNumber}`;
  let method = "GET";

  switch (action) {
    case "status":
      endpoint += "/status";
      method = "GET";
      break;
    case "battery":
      endpoint += "/battery";
      method = "GET";
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
      throw new Error(`[${logPrefix}] Unknown action: ${action}`);
  }

  const url = endpoint;

  if (debug) {
    console.log(
      `[${logPrefix}] Calling Genie API: ${method} ${url} (action=${action})`
    );
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `[${logPrefix}] Genie API ${action} failed with status ${res.status}: ${text}`
    );
  }

  const data = await res.json().catch(() => ({}));

  if (debug) {
    console.log(`[${logPrefix}] Genie API ${action} response:`, data);
  }

  return data;
}

module.exports = {
  callGenie,
};
