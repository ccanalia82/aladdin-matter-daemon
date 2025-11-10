# Aladdin Matter Daemon

This project exposes a Genie Aladdin Connect garage door as a Matter device using Matter.js.  
It allows Apple Home, Google Home, or Alexa (Matter) controllers to open and close the door through your local network.

The core code is cross platform and runs on macOS, Linux, and Windows as long as Node.js 20 or newer is installed.

---

## 1. Requirements

- Node.js 20 or newer
- A Genie Aladdin Connect account
- Network access from the machine that runs this daemon to the Genie cloud

---

## 2. Clone and install

```bash
git clone https://github.com/ccanalia82/aladdin-matter-daemon.git
cd aladdin-matter-daemon
npm install
