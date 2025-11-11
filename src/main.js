// src/main.js
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

const matterCfg = cfg.matter || {};
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

// Credentials: prefer env vars, fall back to config.genie.json
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

function normalizeDoorOpen(status) {
  if (!status) return false;

  // Accept various formats:
  // - string: "OPEN", "CLOSED", "OPENING", "CLOSING"
  // - object: { doorState: "OPEN" } etc.
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

  // Fallback: truthy = open
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
      port: matterCfg.port || 5580,
    },

    commissioning: {
      passcode: matterCfg.passcode || 20202021,
      discriminator: matterCfg.discriminator || 3840,
    },

    productDescription: {
      name: doorCfg.name || "Garage Door",
      deviceType: 0x0100, // On/Off device
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

  const rootEndpoint = new Endpoint(0);
  server.add(rootEndpoint);

  // Use OnOffLightDevice as a generic on/off switch for the garage door
  const doorDevice = new OnOffLightDevice({
    id: 1,
    name: doorCfg.name || "Garage Door",
  });

  const doorEndpoint = new Endpoint(1);
  doorEndpoint.add(doorDevice);
  rootEndpoint.addChild(doorEndpoint);

  // Log endpoint structure
  logEndpoint(server);

  // Initial sync from Genie
  await syncDoorFromGenie(doorDevice, doorCfg);

  // Listen for Matter OnOff changes (On = OPEN, Off = CLOSE)
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

  // Poll door status from Genie
  setInterval(() => {
    pollDoor(doorDevice, doorCfg).catch((err) =>
      console.error("[pollDoor] Unhandled error:", err)
    );
  }, STATUS_POLL_MS);

  // Poll battery once per hour
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
  createServer().catch((err) => {
    console.error("Fatal error starting daemon:", err);
    process.exit(1);
  });
}

module.exports = {
  createServer,
};
