# Homebridge Aladdin Matter Daemon

Expose your Genie Aladdin Connect garage door as a Matter-compatible device for Apple Home, Google Home, or Alexa — directly through Homebridge or as a standalone Node daemon.

This repo contains:

- A standalone **Matter.js daemon** (`src/main.js`)
- A thin **Homebridge platform shim** (`index.js`)
- A small **Genie HTTP client** (`src/genieApi.js`, `src/aladdinClient.js`)

---

## ✨ Features

- Uses Matter.js (`@matter/main` / `@matter/nodejs`)
- Works on macOS, Linux, and Windows
- Uses a modern `fetch()`-based Genie API client (no deprecated libraries)
- Replaces `node-aladdin-connect-garage-door`
- Reads config from `config.genie.json` (plus optional env vars)

---

## ⚙️ Installation

### From GitHub (recommended for Homebridge UI)

Paste this into the **Plugins → Install** box in Homebridge UI:

```text
https://github.com/ccanalia82/aladdin-matter-daemon
```

### From Terminal

```bash
git clone https://github.com/ccanalia82/aladdin-matter-daemon.git
cd aladdin-matter-daemon
npm install
```

---

## 🧰 Configuration (`config.genie.json`)

```json
{
  "name": "Garage Door",
  "username": "your-email@example.com",
  "password": "your-password",
  "batteryLowLevel": 15,
  "doorStatusPollInterval": 15000,
  "logApiResponses": false,
  "logDoorStateChanges": true,
  "platform": "GenieAladdinConnect",
  "_bridge": {
    "username": "0E:39:6E:4E:16:E1",
    "port": 45762,
    "name": "Garage Door Bridge",
    "manufacturer": "Aladdin",
    "model": "Genie",
    "debugModeEnabled": true,
    "matter": { "port": 5531 }
  }
}
```

You can also set environment variables:

```bash
export GENIE_USER="your-email@example.com"
export GENIE_PASS="your-password"
```

These override the `username` / `password` in `config.genie.json`.

---

## ▶️ Running (standalone)

```bash
npm start
```

This executes `src/main.js` via Node. You should see logs like:

```text
Using Node at: /opt/homebrew/bin/node
[Aladdin-Matter] Starting daemon…
[Aladdin-Matter] Server started on port 5580.
[Aladdin-Matter] Door status: CLOSED → CLOSED
```

---

## ▶️ Running via Homebridge

When installed as a Homebridge plugin:

- `index.js` registers the **AladdinMatterDaemon** platform.
- On `didFinishLaunching`, it calls `createServer()` from `src/main.js`.
- The Matter device then appears to your controller and exposes the garage door.

Configuration in the Homebridge UI is defined by `config.schema.json`.

---

## 🔒 Security

- No deprecated HTTP libraries (`request`, `request-promise-native`, etc.)
- No cloud tokens are persisted to disk.
- Genie credentials are read from config / env and held only in process memory.

---

## 🧾 License

MIT © 2025 Chris Canalia
