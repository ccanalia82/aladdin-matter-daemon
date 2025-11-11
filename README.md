# aladdin-matter-daemon

[![npm version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![matter verified](https://img.shields.io/badge/matter-verified-purple.svg)]()
[![GitHub stars](https://img.shields.io/github/stars/ccanalia82/aladdin-matter-daemon.svg?style=social&label=Star)](https://github.com/ccanalia82/aladdin-matter-daemon)
[![GitHub issues](https://img.shields.io/github/issues/ccanalia82/aladdin-matter-daemon.svg)](https://github.com/ccanalia82/aladdin-matter-daemon/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/ccanalia82/aladdin-matter-daemon.svg)](https://github.com/ccanalia82/aladdin-matter-daemon/commits/main)

A lightweight Matter.js-based daemon for **Genie Aladdin Connect** garage doors, exposing them as native **Matter devices** for Apple Home, Google Home, and Alexa.

---

## 📘 Overview

The **Aladdin Matter Daemon** connects to the Genie Aladdin Connect cloud and publishes your garage door as a Matter accessory.  
It allows local-network control of your door from any Matter-compatible controller — no Homebridge required.

---

## ⚙️ Configuration

Example configuration (`config.genie.json`):

```json
{
  "name": "Garage Door",
  "batteryLowLevel": 15,
  "doorStatusStationaryCacheTtl": 15,
  "doorStatusTransitioningCacheTtl": 5,
  "doorStatusPollInterval": 15000,
  "logApiResponses": false,
  "logDoorStateChanges": true,
  "showShared": false,
  "doors": [
    {
      "name": "Main Garage Door",
      "deviceNumber": 0,
      "garageNumber": 1
    }
  ],
  "matter": {
    "nodeId": "aladdin-garage-node",
    "port": 5580,
    "passcode": 20202021,
    "discriminator": 3840,
    "vendorId": 65521,
    "productId": 32769
  }
}
```

### 🔐 Environment Variables

Before starting, export your Genie Aladdin Connect credentials:

**macOS / Linux**
```bash
export GENIE_USER="your-email@example.com"
export GENIE_PASS="your-password"
```

**Windows PowerShell**
```powershell
$env:GENIE_USER="your-email@example.com"
$env:GENIE_PASS="your-password"
```

---

## 🧩 Installation

```bash
git clone https://github.com/ccanalia82/aladdin-matter-daemon.git
cd aladdin-matter-daemon
npm install
```

During installation, a cross-platform postinstall script ensures `start-matter.sh` is executable on macOS and Linux.  
On Windows, this step simply logs a harmless message and continues safely.

If you see:
```
[postinstall] Ensured start-matter.sh is executable (755).
```
it means the setup script ran successfully.

---

## ▶️ Running

Start the daemon on **any platform**:

```bash
npm start
```

This command launches the daemon directly via Node.js (`node src/main.js`) and works the same on macOS, Linux, and Windows.

Expected output:

```
[Aladdin-Matter] Starting Aladdin Matter daemon…
[Aladdin-Matter] Matter server started on port 5580. Commission using code 20202021.
[Aladdin-Matter] Door status: CLOSED -> CLOSED
```

For detailed debug output (development mode):

```bash
npm run start:debug
```

This enables Matter.js debug logs and sets `NODE_ENV=development`.

---

## 🏠 Pairing

1. Open your Matter controller app (Apple Home, Google Home, Alexa, etc.)
2. Tap **Add Accessory** or **Add Matter Device**
3. Enter the pairing code from your configuration file (default: `20202021`)
4. The device appears as **Garage Door**

Toggling **On** opens the door.  
Toggling **Off** closes it.

---

## 🔁 Auto-Start (macOS Example)

Create a launch agent:

```
~/Library/LaunchAgents/com.ccanalia.aladdin-matter-daemon.plist
```

Example:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
 "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.ccanalia.aladdin-matter-daemon</string>
    <key>ProgramArguments</key>
    <array>
      <string>/opt/homebrew/bin/node</string>
      <string>/Users/YOUR_USER/aladdin-matter-daemon/src/main.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/YOUR_USER/aladdin-matter-daemon</string>
    <key>EnvironmentVariables</key>
    <dict>
      <key>GENIE_USER</key>
      <string>YOUR_EMAIL@example.com</string>
      <key>GENIE_PASS</key>
      <string>YOUR_PASSWORD</string>
    </dict>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/YOUR_USER/Library/Logs/aladdin-matter-daemon.out.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USER/Library/Logs/aladdin-matter-daemon.err.log</string>
  </dict>
</plist>
```

Then load it:

```bash
launchctl load ~/Library/LaunchAgents/com.ccanalia.aladdin-matter-daemon.plist
launchctl start com.ccanalia.aladdin-matter-daemon
```

---

## 📜 Logs

- **macOS:**  
  `~/Library/Logs/aladdin-matter-daemon.out.log`  
  `~/Library/Logs/aladdin-matter-daemon.err.log`

- **Linux (systemd):**  
  `journalctl -u aladdin-matter-daemon -f`

- **Windows (PM2 or manual):**  
  `pm2 logs aladdin-matter-daemon`

---

## 🧑‍💻 Building and Contributing

### Clone and install

```bash
git clone https://github.com/ccanalia82/aladdin-matter-daemon.git
cd aladdin-matter-daemon
npm install
```

During installation, a postinstall script ensures `start-matter.sh` is executable on macOS and Linux.  
On Windows, it logs a message and continues safely.

If you see:
```
[postinstall] Ensured start-matter.sh is executable (755).
```
you’re ready to go.

---

### Development workflow

Run the daemon directly in development mode:

```bash
npm run start:debug
```

This sets `NODE_ENV=development` and enables detailed debug logging for Matter and Genie communication.

For production use:
```bash
npm start
```

---

### Project structure

| Path | Description |
|------|-------------|
| `src/main.js` | Main daemon process that starts the Matter server and synchronizes Genie ↔ Matter |
| `src/aladdinClient.js` | Wrapper for the Genie Aladdin Connect API |
| `start-matter.sh` | Cross-platform launch script used by npm start |
| `scripts/postinstall.js` | Ensures `start-matter.sh` is executable across macOS, Linux, and Windows |
| `config.genie.json` | Daemon configuration (port, passcode, polling, etc.) |

---

### Contributing

1. Fork the repository on GitHub.  
2. Create a new branch for your feature or fix.  
3. Make your changes and confirm `npm install` and `npm start` both succeed.  
4. Submit a pull request with a clear description of your change.

---

### Common commands

| Command | Description |
|----------|-------------|
| `npm install` | Installs dependencies and fixes script permissions automatically |
| `npm start` | Starts the daemon normally |
| `npm run start:debug` | Runs with debug logs enabled |
| `npm test` | *(Reserved for future test suite)* |

---

### 🪟 Windows notes

On Windows, the daemon runs correctly in **PowerShell** or **WSL**.  
The `postinstall` step logs a harmless warning if it cannot set POSIX permissions; this doesn’t affect functionality.

To start manually in PowerShell:

```powershell
node .\src\main.js
```

---

## ⚠️ Known Limitations (Beta)

- Only the first door in `config.genie.json` is exposed  
- Uses generic On/Off device type (not GarageDoor cluster yet)  
- Genie cloud outages may temporarily desync state  
- Matter fabric persistence not yet implemented

---

## 📄 License

MIT License © 2025 Chris Canalia

---

## 🔗 See Also

- [Genie Aladdin Connect](https://www.geniecompany.com/aladdinconnect)
- [homebridge-aladdin-connect](https://github.com/homebridge-plugins/homebridge-aladdin-connect)
- [Matter.js on GitHub](https://github.com/project-chip/matter.js)
