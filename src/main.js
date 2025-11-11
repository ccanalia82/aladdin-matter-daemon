// src/main.js
//
// Matter.js server that exposes a single "garage door" as an On/Off device.
// This can be run directly via `npm start`, or invoked from Homebridge
// (see index.js) as a platform daemon.
//
// High-level flow:
// 1. Load configuration (Genie credentials, Matter settings, poll intervals).
// 2. Create a Matter ServerNode and an OnOff device that represents the door.
// 3. On startup, sync door state from Genie to Matter.
// 4. Listen for Matter on/off changes and translate them to Genie open/close.
// 5. Periodically poll Genie for updated status and battery info.

const fs = require("fs");
const path = require("path");
const { ServerNode, Endpoint, VendorId } = require("@matter/main");
const { OnOffLightDevice } = require("@matter/main/devices/on-off-light");
const { logEndpoint } = require("@matter/main/protocol");
require("@matter/nodejs");

const {
  getDoorStatus,
  openDoor,
  closeDoor,
  getBattery,
} = require("./aladdinClient");

// ---------- Config loading ----------

/**
 * Path to the standalone configuration file for Genie + Matter.
 * Note: Homebridge config is currently NOT wired directly here; this file
 * remains the single source of truth for the daemon’s runtime configuration.
 */
const configPath = path.join(__dirname, "..", "config.genie.json");
let cfg;

try {
  const raw = fs.readFileSync(configPath, "utf8");
  cfg = JSON.parse(raw);
} catch (err) {
  console.error(
    `[Config] Failed to read or parse ${configPath}:`,
    err.message
  );
  process.exit(1);
}

// Matter-specific config lives under _bridge.matter for now.
// Example: { "_bridge": { "matter": { "port": 5531, "passcode": 20202021 } } }
const matterCfg = (cfg._bridge && cfg._bridge.matter) || {};

// If multiple doors are ever supported, cfg.doors[] would be used.
// For now we fallback to a single logical door derived from cfg.
const doors =
  (cfg.doors && Array.isArray(cfg.doors) && cfg.doors.length > 0
    ? cfg.doors
    : [
        {
          name: cfg.name || "Garage Door",
          deviceNumber: 0,
          garageNumber: 1,
        },
      ]);

// Credentials: prefer environment, fall back to file.
// This makes it easy to override secrets without committing them.
const GENIE_USER = process.env.GENIE_USER || cfg.username;
const GENIE_PASS = process.env.GENIE_PASS || cfg.password;

if (!GENIE_USER || !GENIE_PASS) {
  console.error(
    "[Config] Missing Genie credentials. Set GENIE_USER and GENIE_PASS or provide username/password in config.genie.json."
  );
  process.exit(1);
}

// Poll intervals and thresholds.
const STATUS_POLL_MS = cfg.doorStatusPollInterval || 15000;
const BATTERY_LOW_LEVEL =
  typeof cfg.batteryLowLevel === "number" ? cfg.batteryLowLevel : 15;

// ---------- Helpers ----------

/**
 * Normalize a variety of Genie status responses into a boolean "open" flag.
 *
 * Genie’s response objects/fields may evolve, so we defensively check
 * multiple property names and types here.
 *
 * @param {any} status - Raw status object or value from Genie API.
 * @returns {boolean} true if door is considered OPEN, false if CLOSED.
 */
function normalizeDoorOpen(status) {
  if (!status) return false;
  let s = status;

  if (typeof status === "object" && status !== null) {
    s =
      status.doorState ||
      status.state ||
      status.status ||
      status.door_status ||
      status.currentState;
  }

  if (typeof s === "string") {
    const up = s.toUpperCase();
    if (up === "OPEN" || up === "OPENING") return true;
    if (up === "CLOSED" || up === "CLOSING") return false;
  }

  // Fallback: treat truthy as open.
  return !!s;
}

// ---------- Matter / Genie glue ----------

/**
 * Perform a one-time sync of door state from Genie into the Matter device.
 * Called on startup so the Matter server starts with an accurate representation
 * of the real-world door position.
 *
 * @param {OnOffLightDevice} device - Matter device representing the door.
 * @param {Object} doorCfg - Selected door configuration object.
 */
async function syncDoorFromGenie(device, doorCfg) {
  try {
    const status = await getDoorStatus({
      username: GENIE_USER,
      password: GENIE_PASS,
      deviceNumber: doorCfg.deviceNumber,
      garageNumber: doorCfg.garageNumber,
      debug: cfg.logApiResponses || false,
    });

    const isOpen = normalizeDoorOpen(status);
    device.state.onOff = isOpen;

    console.log(
      `[Genie] Initial door status (${doorCfg.name || "Garage Door"}): ${
        isOpen ? "OPEN" : "CLOSED"
      }`
    );
  } catch (err) {
    console.error("[syncDoorFromGenie] Error:", err);
  }
}

/**
 * Handle Matter on/off commands and translate them to Genie open/close calls.
 *
 * Matter semantics:
 *   onOff = true  -> treat as "door should be OPEN"
 *   onOff = false -> treat as "door should be CLOSED"
 *
 * @param {boolean} targetOpen - Desired end state from Matter (true=open)
 * @param {Object} doorCfg - Door configuration record
 */
async function actuateDoorFromMatter(targetOpen, doorCfg) {
  try {
    if (targetOpen) {
      console.log("[Matter] Command: OPEN door via Genie");
      const res = await openDoor({
        username: GENIE_USER,
        password: GENIE_PASS,
        deviceNumber: doorCfg.deviceNumber,
        garageNumber: doorCfg.garageNumber,
        debug: cfg.logApiResponses || false,
      });
      console.log("[Genie] openDoor result:", res);
    } else {
      console.log("[Matter] Command: CLOSE door via Genie");
      const res = await closeDoor({
        username: GENIE_USER,
        password: GENIE_PASS,
        deviceNumber: doorCfg.deviceNumber,
        garageNumber: doorCfg.garageNumber,
        debug: cfg.logApiResponses || false,
      });
      console.log("[Genie] closeDoor result:", res);
    }
  } catch (err) {
    console.error("[actuateDoorFromMatter] Error:", err);
  }
}

/**
 * Periodically poll Genie for door state and reflect it into Matter.
 *
 * This keeps the Matter controller updated if the door moves due to
 * physical remotes, wall buttons, or the Genie app.
 *
 * @param {OnOffLightDevice} device
 * @param {Object} doorCfg
 */
async function pollDoor(device, doorCfg) {
  try {
    const status = await getDoorStatus({
      username: GENIE_USER,
      password: GENIE_PASS,
      deviceNumber: doorCfg.deviceNumber,
      garageNumber: doorCfg.garageNumber,
      debug: cfg.logApiResponses || false,
    });

    const isOpen = normalizeDoorOpen(status);
    const prevOpen = !!device.state.onOff;

    if (isOpen !== prevOpen) {
      console.log(
        `[Genie] Door status changed (${doorCfg.name || "Garage Door"}): ${
          prevOpen ? "OPEN" : "CLOSED"
        } -> ${isOpen ? "OPEN" : "CLOSED"}`
      );
      device.state.onOff = isOpen;
    } else if (cfg.logDoorStateChanges) {
      console.log(
        `[Genie] Door status (${doorCfg.name || "Garage Door"}): ${
          isOpen ? "OPEN" : "CLOSED"
        }`
      );
    }
  } catch (err) {
    console.error("[pollDoor] Error:", err);
  }
}

/**
 * Poll battery once per hour and log low-battery warnings.
 *
 * @param {Object} doorCfg
 */
async function batteryPoll(doorCfg) {
  try {
    const info = await getBattery({
      username: GENIE_USER,
      password: GENIE_PASS,
      deviceNumber: doorCfg.deviceNumber,
      garageNumber: doorCfg.garageNumber,
      debug: cfg.logApiResponses || false,
    });

    const batt =
      typeof info === "number"
        ? info
        : info.batteryLevel ||
          info.battery ||
          info.level ||
          info.stateOfCharge;

    if (batt != null) {
      console.log(`[Genie] Battery (${doorCfg.name || "Garage Door"}): ${batt}%`);
      if (BATTERY_LOW_LEVEL && batt <= BATTERY_LOW_LEVEL) {
        console.warn(
          `[Genie] Battery low (${batt}%) for ${
            doorCfg.name || "Garage Door"
          }`
        );
      }
    } else {
      console.log("[Genie] Battery response did not include a numeric level:", info);
    }
  } catch (err) {
    console.error("[batteryPoll] Error:", err);
  }
}

// ---------- Matter server startup ----------

/**
 * Create and start the Matter.js ServerNode for the Genie garage door.
 *
 * This does all the wiring:
 * - Sets up the root endpoint and a single OnOffLightDevice for the door.
 * - Hooks up Genie sync, polling, and command translation.
 * - Starts the Matter stack listening on the configured UDP port.
 *
 * @returns {Promise<ServerNode>} The started Matter server instance.
 */
async function createServer() {
  const doorCfg = doors[0];

  const server = await ServerNode.create({
    id: matterCfg.nodeId || "aladdin-garage-node",

    network: {
      // UDP port for Matter IPv6 traffic.
      port: matterCfg.port || 5580,
    },

    commissioning: {
      // Standard Matter test passcode/discriminator by default.
      passcode: matterCfg.passcode || 20202021,
      discriminator: matterCfg.discriminator || 3840,
    },

    productDescription: {
      name: doorCfg.name || "Garage Door",
      deviceType: 0x0100, // On/Off device (generic)
    },

    basicInformation: {
      vendorName: "Aladdin Connect",
      vendorId: VendorId(matterCfg.vendorId || 0xfff1),
      productName: "Genie Garage Door via Matter",
      productId: matterCfg.productId || 0x8001,
      nodeLabel: cfg.name || "Garage Door",
      hardwareVersion: 1,
      hardwareVersionString: "1",
      softwareVersion: 1,
      softwareVersionString: "1.0.0",
    },
  });

  // Endpoint 0 is the root; standard Matter pattern.
  const rootEndpoint = new Endpoint(0);
  server.add(rootEndpoint);

  // Use OnOffLightDevice as a generic On/Off actuator for the door.
  const doorDevice = new OnOffLightDevice({
    id: 1,
    name: doorCfg.name || "Garage Door",
  });

  const doorEndpoint = new Endpoint(1);
  doorEndpoint.add(doorDevice);
  rootEndpoint.addChild(doorEndpoint);

  // Helpful dump of the endpoint tree for debugging / introspection.
  logEndpoint(server);

  // Initial sync from Genie before we start advertising.
  await syncDoorFromGenie(doorDevice, doorCfg);

  // Subscribe to Matter on/off changes (these map to OPEN/CLOSE).
  if (doorDevice.events && doorDevice.events.onOffChange) {
    doorDevice.events.onOffChange.on(async ({ value }) => {
      const targetOpen = !!value;
      await actuateDoorFromMatter(targetOpen, doorCfg);
    });
  } else {
    console.warn(
      "[Matter] Warning: OnOff change event not available on device; check Matter.js version."
    );
  }

  // Poll door status from Genie.
  setInterval(() => {
    pollDoor(doorDevice, doorCfg).catch((err) =>
      console.error("[pollDoor] Unhandled error:", err)
    );
  }, STATUS_POLL_MS);

  // Poll battery once per hour.
  setInterval(() => {
    batteryPoll(doorCfg).catch((err) =>
      console.error("[batteryPoll] Unhandled error:", err)
    );
  }, 60 * 60 * 1000);

  await server.start();

  console.log(
    `[Matter] Server started on port ${
      matterCfg.port || 5580
    }. Commission using code ${matterCfg.passcode || 20202021}.`
  );
  console.log(
    "Aladdin Matter daemon is up. Pair it from your Matter controller."
  );

  return server;
}

// ---------- CLI entrypoint ----------

// If invoked directly (`node src/main.js`), start the server.
if (require.main === module) {
  createServer().catch((err) => {
    console.error("Fatal error starting daemon:", err);
    process.exit(1);
  });
}

// Exported so Homebridge (index.js) can start us as a library.
module.exports = {
  createServer,
};
