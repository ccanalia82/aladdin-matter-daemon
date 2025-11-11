const BASE_URL = "https://geniecompany.com/api";

async function login(username, password, debug = false) {
  const url = `${BASE_URL}/v1/login`;
  if (debug) console.log(`[GenieAPI] Logging in at ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error(`[GenieAPI] Login failed ${res.status}`);
  const data = await res.json();
  return data.token || data.accessToken || data.idToken;
}

async function callGenie({ username, password, action, deviceNumber = 0, garageNumber = 1, debug = false }) {
  const token = await login(username, password, debug);
  let endpoint = `${BASE_URL}/v1/devices/${deviceNumber}/garages/${garageNumber}`;
  let method = "GET";
  switch (action) {
    case "status": endpoint += "/status"; break;
    case "battery": endpoint += "/battery"; break;
    case "open": endpoint += "/open"; method = "POST"; break;
    case "close": endpoint += "/close"; method = "POST"; break;
    default: throw new Error(`[GenieAPI] Invalid action: ${action}`);
  }
  if (debug) console.log(`[GenieAPI] Calling ${method} ${endpoint}`);
  const res = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) throw new Error(`[GenieAPI] ${action} failed ${res.status}`);
  return await res.json().catch(() => ({}));
}

module.exports = { callGenie };
