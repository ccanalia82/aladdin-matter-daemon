/**
 * Local Genie Cloud API using native fetch()
 */

const BASE_URL = "https://geniecompany.com/api"; // TODO: adjust after testing

async function login(username, password, debug = false, logPrefix = "GenieAPI") {
  const url = `${BASE_URL}/v1/login`;
  if (debug) console.log(`[${logPrefix}] Logging in: ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[${logPrefix}] Login failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const token = data.token || data.accessToken || data.idToken;
  if (!token) throw new Error(`[${logPrefix}] Missing access token`);
  if (debug) console.log(`[${logPrefix}] Login successful`);
  return token;
}

async function callGenie({
  username,
  password,
  action,
  deviceNumber = 0,
  garageNumber = 1,
  debug = false,
  logPrefix = "GenieAPI"
}) {
  const token = await login(username, password, debug, logPrefix);
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
      throw new Error(`[${logPrefix}] Unknown action: ${action}`);
  }

  if (debug) console.log(`[${logPrefix}] Calling ${method} ${endpoint}`);

  const res = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[${logPrefix}] ${action} failed: ${res.status} ${text}`);
  }

  const data = await res.json().catch(() => ({}));
  if (debug) console.log(`[${logPrefix}] ${action} response:`, data);
  return data;
}

module.exports = { callGenie };
