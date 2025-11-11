// src/main.js
// Matter.js server that exposes a single "garage door" as an On/Off device.
// This can be run directly via `npm start`, or invoked from Homebridge
// (see index.js) as a platform daemon.

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
const matterCfg = (cfg._bridge && cfg._bridge.matter) || {};

// If multiple doors are ever supported, cfg.doors[] would be used.
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
const GENIE_USER = process.env.GENIE_USER || cfg.username;
const GENIE_PASS = process.env.GENIE_PASS || cfg.password;

if (!GENIE_USER || !GENIE_PASS) {
  console.error(
    "[Config] Missing Genie credentials. Set GENIE_USER and GENIE_PASS or provide username/password in config.genie.json."
  );
  process.exit(1);
}

const STATUS_POLL_MS = cfg.doorStatusPollInterval || 15000;
const BATTERY_LOW_LEVEL =
  typeof cfg.batteryLowLevel === "number" ? cfg.batteryLowLevel : 15;

// ---------- Helpers ----------

/**
 * Normalize a variety of Genie status responses into a boolean "open" flag.
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

  // Helpful dump of the endpoint tree.
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

if (require.main === module) {
  // If invoked directly (`node src/main.js`), start the server.
  createServer().catch((err) => {
    console.error("Fatal error starting daemon:", err);
    process.exit(1);
  });
}

// Exported so Homebridge (index.js) can start us as a library.
module.exports = {
  createServer,
};
