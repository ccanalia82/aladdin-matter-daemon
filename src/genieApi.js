// src/genieApi.js
// Modern replacement for node-aladdin-connect-garage-door
// Uses native fetch() in Node 20+

const BASE_URL = "https://geniecompany.com/api"; // placeholder; we'll refine exact endpoints later

/**
 * Log in to Genie Cloud and return an auth token
 */
async function login(username, password) {
  const res = await fetch(`${BASE_URL}/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error(`Login failed with status ${res.status}`);
  }

  const data = await res.json();
  return data.token || data.accessToken;
}

/**
 * Perform a Genie action (status, open, close, etc.)
 */
async function callGenie({ username, password, action, deviceNumber = 0, garageNumber = 1, debug = false }) {
  const token = await login(username, password);

  let endpoint = `${BASE_URL}/v1/devices/${deviceNumber}/door/${garageNumber}`;
  let method = "GET";
  let body = null;

  switch (action) {
    case "status":
      endpoint += "/status";
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
      throw new Error(`Unknown action: ${action}`);
  }

  const res = await fetch(endpoint, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Genie API ${action} failed: ${res.status}`);
  }

  const data = await res.json();
  if (debug) console.log(`[GenieAPI] ${action} response:`, data);

  return data;
}

module.exports = { callGenie };
