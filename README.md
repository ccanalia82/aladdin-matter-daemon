# aladdin-matter-daemon

[![npm version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![matter verified](https://img.shields.io/badge/matter-verified-purple.svg)]()
[![GitHub stars](https://img.shields.io/github/stars/ccanalia82/aladdin-matter-daemon.svg?style=social&label=Star)](https://github.com/ccanalia82/aladdin-matter-daemon)
[![GitHub issues](https://img.shields.io/github/issues/ccanalia82/aladdin-matter-daemon.svg)](https://github.com/ccanalia82/aladdin-matter-daemon/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/ccanalia82/aladdin-matter-daemon.svg)](https://github.com/ccanalia82/aladdin-matter-daemon/commits/main)

Matter-based daemon for Genie Aladdin Connect garage doors.

---

## Matter Platform Daemon

**Aladdin Matter Daemon** is a standalone [Matter](https://csa-iot.org/all-solutions/matter/) bridge for [Genie Aladdin Connect](https://www.geniecompany.com/aladdinconnect) garage door openers.

It allows your Genie doors to appear as native Matter accessories in Apple Home, Google Home, Alexa, or any other Matter controller.

---

## Configuration

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

### Environment Variables

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

## Installation

```bash
git clone https://github.com/ccanalia82/aladdin-matter-daemon.git
cd aladdin-matter-daemon
npm install
```

---

## Running

To start the daemon manually:

```bash
npm start
```

Example output:

```
Starting Aladdin Matter daemon
Matter server started on port 5580. Commission using code 20202021.
[Genie] Door status: CLOSED -> CLOSED
```

---

## Pairing

1. Open your Matter controller app (Apple Home, Google Home, Alexa, etc.)
2. Tap **Add Accessory** or **Add Matter Device**
3. Enter the passcode from your config file (default: `20202021`)
4. The device will appear as **Garage Door**

Toggling **On** opens the door.  
Toggling **Off** closes it.

---

## Auto Start (macOS Example)

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

Then load:

```bash
launchctl load ~/Library/LaunchAgents/com.ccanalia.aladdin-matter-daemon.plist
launchctl start com.ccanalia.aladdin-matter-daemon
```

---

## Logs

- **macOS:**  
  `~/Library/Logs/aladdin-matter-daemon.out.log`  
  `~/Library/Logs/aladdin-matter-daemon.err.log`

- **Linux (systemd):**  
  `journalctl -u aladdin-matter-daemon -f`

- **Windows (PM2):**  
  `pm2 logs aladdin-matter-daemon`

---

## License

MIT License © 2025 Chris Canalia

---

## See Also

- [Genie Aladdin Connect](https://www.geniecompany.com/aladdinconnect)
- [homebridge-aladdin-connect](https://github.com/homebridge-plugins/homebridge-aladdin-connect)
- [Matter.js on GitHub](https://github.com/project-chip/matter.js)

---
