"use strict";

const fs = require("fs");
const path = require("path");
const { ServerNode, Endpoint, VendorId } = require("@matter/main");
const { OnOffLightDevice } = require("@matter/main/devices/on-off-light");
const { logEndpoint } = require("@matter/main/protocol");
require("@matter/nodejs"); // Initialize Matter for Node.js runtime

const {
  getDoorStatus,
  openDoor,
  closeDoor,
  getBattery,
} = require("./aladdinClient");

// ---- Load config ----

const CONFIG_PATH = path.join(__dirname, "..", "config.genie.json");

if (!fs.existsSync(CONFIG_PATH)) {
  console.error(`[Aladdin-Matter] Missing config file: ${CONFIG_PATH}`);
  process.exit(1);
}

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
} catch (err) {
  console.error("[Aladdin-Matter] Failed to parse config.genie.json:", err);
  process.exit(1);
}

const GENIE_USER = process.env.GENIE_USER;
const GENIE_PASS = process.env.GENIE_PASS;

if (!GENIE_USER || !GENIE_PASS) {
  console.error("[Aladdin-Matter] GENIE_USER and GENIE_PASS must be set in the environment.");
  process.exit(1);
}

const POLL_INTERVAL = cfg.doorStatusPollInterval || 15000;

const doorCfg = (cfg.doors && cfg.doors[0]) || {
  name: cfg.name || "Garage Door",
  deviceNumber: 0,
  garageNumber: 1,
};

const matterCfg = cfg.matter || {};

const DoorState = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  OPENING: "OPENING",
  CLOSING: "CLOSING",
  UNKNOWN: "UNKNOWN",
};

function mapStatusToDoorState(status) {
  switch (status) {
    case "OPEN":
      return DoorState.OPEN;
    case "CLOSED":
      return DoorState.CLOSED;
    case "OPENING":
      return DoorState.OPENING;
    case "CLOSING":
      return DoorState.CLOSING;
    default:
      return DoorState.UNKNOWN;
  }
}

function isOpenState(state) {
  return state === DoorState.OPEN || state === DoorState.OPENING;
}

// ---- Matter node setup ----

async function createMatterNode() {
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
      deviceType: 0x0100, // OnOff light-type device
    },

    basicInformation: {
      vendorName: "Aladdin-Matter-Bridge",
      vendorId: VendorId(matterCfg.vendorId || 0xfff1),
      nodeLabel: doorCfg.name || "Garage Door",
      productName: "Aladdin Garage (Matter)",
      productLabel: "Aladdin Garage",
      productId: matterCfg.productId || 0x8001,
      serialNumber: `aladdin-${matterCfg.nodeId || "node"}`,
      uniqueId: matterCfg.nodeId || "aladdin-garage-node",
    },
  });

  const endpoint = new Endpoint(OnOffLightDevice, {
    id: "garage-door-1",
    onOff: {
      onOff: false,
    },
  });

  const device = await server.add(endpoint);
  logEndpoint(device);

  return { server, endpoint: device };
}

// ---- Sync logic: Genie ⇄ Matter ----

async function syncFromGenie(endpoint) {
  try {
    const status = await getDoorStatus({
      username: GENIE_USER,
      password: GENIE_PASS,
      deviceNumber: doorCfg.deviceNumber,
      garageNumber: doorCfg.garageNumber,
      debug: cfg.logApiResponses || false,
      logPrefix: "GenieStatus",
    });

    const mapped = mapStatusToDoorState(status);

    if (cfg.logDoorStateChanges) {
      console.log(
        `[Aladdin-Matter] Door status from Genie: raw="${status}" mapped="${mapped}" @ ${new Date().toISOString()}`
      );
    }

    const shouldBeOn = isOpenState(mapped);
    const current = endpoint.state.onOff?.onOff;

    if (current !== shouldBeOn) {
      await endpoint.set({
        onOff: { onOff: shouldBeOn },
      });
      console.log(
        `[Aladdin-Matter] Updated Matter OnOff to ${shouldBeOn ? "ON (OPEN)" : "OFF (CLOSED)"}`
      );
    }
  } catch (err) {
    console.error("[Aladdin-Matter] Error during syncFromGenie:", err);
  }
}

async function actuateDoorFromMatter(newOnValue) {
  const targetOpen = !!newOnValue;

  try {
    if (targetOpen) {
      console.log("[Aladdin-Matter] Matter command: OPEN door via Genie");
      const res = await openDoor({
        username: GENIE_USER,
        password: GENIE_PASS,
        deviceNumber: doorCfg.deviceNumber,
        garageNumber: doorCfg.garageNumber,
        debug: cfg.logApiResponses || false,
        logPrefix: "GenieOpen",
      });
      console.log("[Aladdin-Matter] Genie openDoor result:", res);
    } else {
      console.log("[Aladdin-Matter] Matter command: CLOSE door via Genie");
      const res = await closeDoor({
        username: GENIE_USER,
        password: GENIE_PASS,
        deviceNumber: doorCfg.deviceNumber,
        garageNumber: doorCfg.garageNumber,
        debug: cfg.logApiResponses || false,
        logPrefix: "GenieClose",
      });
      console.log("[Aladdin-Matter] Genie closeDoor result:", res);
    }
  } catch (err) {
    console.error("[Aladdin-Matter] Error during actuateDoorFromMatter:", err);
  }
}

// ---- Battery polling ----

function scheduleBatteryPolling() {
  if (cfg.batteryLowLevel == null) {
    return;
  }

  const intervalMs = 60 * 60 * 1000; // hourly

  setInterval(async () => {
    try {
      const batt = await getBattery({
        username: GENIE_USER,
        password: GENIE_PASS,
        deviceNumber: doorCfg.deviceNumber,
        garageNumber: doorCfg.garageNumber,
        debug: false,
        logPrefix: "GenieBattery",
      });

      if (batt == null) {
        console.warn("[Aladdin-Matter] Battery status could not be parsed.");
        return;
      }

      if (batt <= cfg.batteryLowLevel) {
        console.warn(`[Aladdin-Matter] Battery low: ${batt}%`);
      } else {
        console.log(`[Aladdin-Matter] Battery: ${batt}%`);
      }
    } catch (err) {
      console.error("[Aladdin-Matter] Error during battery polling:", err);
    }
  }, intervalMs);
}

// ---- Main daemon entrypoint ----

(async () => {
  try {
    console.log("[Aladdin-Matter] Starting Aladdin Matter daemon…");

    const { server, endpoint } = await createMatterNode();

    // Keep server running & listening
    await server.start();
    console.log(
      `[Aladdin-Matter] Matter server started on port ${
        matterCfg.port || 5580
      }. Commission using code ${matterCfg.passcode || 20202021}.`
    );

    // Initial sync from Genie -> Matter
    await syncFromGenie(endpoint);

    // Listen for Matter On/Off changes -> Genie commands
    endpoint.events.onOff.onOff$Changed.on(async (value) => {
      console.log(
        `[Aladdin-Matter] Matter OnOff changed to ${value ? "ON" : "OFF"} from controller`
      );
      await actuateDoorFromMatter(value);
      // Re-sync after movement
      setTimeout(() => syncFromGenie(endpoint), 10000);
    });

    // Periodic polling of Genie to keep status fresh
    setInterval(() => {
      syncFromGenie(endpoint);
    }, POLL_INTERVAL);

    // Battery polling
    scheduleBatteryPolling();

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`[Aladdin-Matter] Received ${signal}, shutting down…`);
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    console.log("[Aladdin-Matter] Daemon is up. Pair it from your Matter controller.");
  } catch (err) {
    console.error("[Aladdin-Matter] Fatal error starting daemon:", err);
    process.exit(1);
  }
})();
