# 🏠 Homebridge Aladdin Matter Daemon

Expose your **Genie Aladdin Connect garage door** as a **Matter-compatible device** for Apple Home, Google Home, or Alexa — either through **Homebridge** or as a **standalone Node.js daemon**.

---

## 📦 Project Overview

This repository provides three main components:

- 🧠 **Matter.js Daemon** (`src/main.js`) — runs a local Matter server for Genie doors.  
- 🔌 **Homebridge Platform Shim** (`index.js`) — allows Homebridge to manage the daemon as a plugin.  
- 🌐 **Genie HTTP Client** (`src/genieApi.js` / `src/aladdinClient.js`) — provides a modern, `fetch()`-based API wrapper.

It replaces legacy implementations that depend on deprecated modules like `request` or `request-promise-native`, and instead uses `@matter/main` and `@matter/nodejs` for a clean, modern Matter integration.

---

## ✨ Features

✅ Uses **Matter.js** (`@matter/main` / `@matter/nodejs`)  
✅ Cross-platform: **macOS**, **Linux**, and **Windows**  
✅ Secure, token-based Genie login via modern **`fetch()` API**  
✅ No cloud storage — all credentials stay in memory  
✅ Backward-compatible with **Homebridge UI**  
✅ Reads configuration from `config.genie.json` or **environment variables**

---

## ⚙️ Installation

### 🧩 Via Homebridge UI (Recommended)

In the **Homebridge UI → Plugins → Install** field, paste the repository URL:

```text
https://github.com/ccanalia82/aladdin-matter-daemon
```

### 💻 Manual Installation (CLI)

```bash
git clone https://github.com/ccanalia82/aladdin-matter-daemon.git
cd aladdin-matter-daemon
npm install
```

This installs all dependencies and prepares `start-matter.sh` to be executable.

---

## 🧰 Configuration (`config.genie.json`)

Example configuration file:

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

You can also define your Genie credentials as environment variables (these override the file):

```bash
export GENIE_USER="your-email@example.com"
export GENIE_PASS="your-password"
```

---

## ▶️ Running (Standalone Daemon)

```bash
npm start
```

This executes `src/main.js` and launches the Matter server.  
Expected console output:

```text
Using Node at: /opt/homebrew/bin/node
[Matter] Server started on port 5580.
[Genie] Door status: CLOSED → CLOSED
```

Once started, the daemon broadcasts the garage door as a **Matter On/Off device** discoverable by your controller.

---

## 🏡 Running via Homebridge

When installed through Homebridge:

- `index.js` registers the **AladdinMatterDaemon** platform.  
- On Homebridge’s `didFinishLaunching` event, it triggers `createServer()` from `src/main.js`.  
- The daemon starts automatically, and the garage door appears in your Home app.

Configuration fields in the Homebridge UI come from `config.schema.json`.

---

## 🧪 Testing Connectivity

You can validate Genie credentials independently using:

```bash
node src/testClient.js
```

This authenticates with Genie and logs the current garage door status to verify network and API access.

---

## 🔒 Security Notes

- ✅ No deprecated or insecure libraries (`request`, `request-promise-native`, etc.).  
- ✅ Credentials are **never written to disk** — they exist only in process memory.  
- ✅ Safe to store in Homebridge environments using environment variables.

---

## 🧾 License

**MIT License**  
Copyright © 2025  
**Author:** [Chris Canalia](https://github.com/ccanalia82)

---

## 💡 Developer Notes

This plugin was built to help bridge the gap between **Genie Aladdin Connect**’s cloud-based API and **local Matter ecosystems**, enabling privacy-preserving control of your garage door within Apple Home, Google Home, or Alexa without third-party dependencies.

Contributions, bug reports, and forks are welcome. Please open issues or pull requests if you encounter API or Matter interoperability issues.
