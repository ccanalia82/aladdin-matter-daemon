# Aladdin Matter Daemon

[![npm version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

This project exposes your **Genie Aladdin Connect** garage door opener as a **Matter device** using Matter.js.  
It allows Apple Home, Google Home, Alexa, and other Matter-enabled controllers to control your garage door locally.

This is a standalone daemon version inspired by the [homebridge-aladdin-connect](https://github.com/homebridge-plugins/homebridge-aladdin-connect) plugin, designed to run independently on macOS, Linux, or Windows systems.

---

## Features

- Connects securely to Genie’s Aladdin Connect cloud API  
- Exposes garage door(s) as **Matter-compliant on/off devices**  
- Works with Apple Home, Google Home, Alexa, and other Matter controllers  
- Supports multiple doors and real-time door state updates  
- Optional local auto-start with macOS `launchd` or Linux `systemd`  

---

## Requirements

- Node.js **v20 or newer**
- An active Genie Aladdin Connect account
- A local network that supports Matter
- For macOS: Apple Silicon or Intel with `/opt/homebrew` available

---

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/ccanalia82/aladdin-matter-daemon.git
cd aladdin-matter-daemon
npm install
