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

// Load config
const configPath = path.join(__dirname, "..", "config.genie.json");
const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const GENIE_USER = process.env.GENIE_USER;
const GENIE_PASS = process.env.GENIE_PASS;

if (!GENIE_USER || !GENIE_PASS) {
  console.error("GENIE_USER and GENIE_PASS must be set in the environment.");
  process.exit(1);
}

const POLL_INTERVAL = cfg.doorStatusPollInterval || 15000;

const doorCfg = cfg.doors[0] || {
  name: cfg.name || "Garage Door",
  deviceNumber: 0,
  garageNumber: 1,
};

const matterCfg = cfg.matter;

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
      deviceType: 0x0100,
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

async function syncFromGenie(endpoint) {
  try {
    const status = await getDoorStatus({
      username: GENIE_USER,
      password: GENIE_PASS,
      deviceNumber: doorCfg.deviceNumber,
      garageNumber: doorCfg.garageNumber,
      debug: cfg.logApiResponses || false,
    });

    const mapped = mapStatusToDoorState(status);

    if (cfg.logDoorStateChanges) {
      console.log(
        `[Genie] Door status: ${status} -> ${mapped} @ ${new Date().toISOString()}`
      );
    }

    const shouldBeOn = isOpenState(mapped);

    const current = endpoint.state.onOff?.onOff;
    if (current !== shouldBeOn) {
      await endpoint.set({
        onOff: { onOff: shouldBeOn },
      });
      console.log(`[Matter] Updated OnOff to ${shouldBeOn ? "ON (OPEN)" : "OFF (CLOSED)"}`);
    }
  } catch (err) {
    console.error("[syncFromGenie] Error:", err);
  }
}

async function actuateDoorFromMatter(newOnValue) {
  const targetOpen = !!newOnValue;

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

(async () => {
  try {
    console.log("Starting Aladdin Matter daemon");

    const { server, endpoint } = await createMatterNode();

    await server.start();
    console.log(
      `Matter server started on port ${matterCfg.port || 5580}. Commission using code ${
        matterCfg.passcode || 20202021
      }.`
    );

    await syncFromGenie(endpoint);

    endpoint.events.onOff.onOff$Changed.on(async (value) => {
      console.log(`[Matter] OnOff changed to ${value ? "ON" : "OFF"} from controller`);
      await actuateDoorFromMatter(value);
      setTimeout(() => syncFromGenie(endpoint), 10000);
    });

    setInterval(() => {
      syncFromGenie(endpoint);
    }, POLL_INTERVAL);

    if (cfg.batteryLowLevel != null) {
      setInterval(async () => {
        try {
          const batt = await getBattery({
            username: GENIE_USER,
            password: GENIE_PASS,
            deviceNumber: doorCfg.deviceNumber,
            garageNumber: doorCfg.garageNumber,
            debug: false,
          });
          if (batt <= cfg.batteryLowLevel) {
            console.warn(`[Genie] Battery low: ${batt}%`);
          } else {
            console.log(`[Genie] Battery: ${batt}%`);
          }
        } catch (err) {
          console.error("[batteryPoll] Error:", err);
        }
      }, 60 * 60 * 1000);
    }

    console.log("Aladdin Matter daemon is up. Pair it from your Matter controller.");
  } catch (err) {
    console.error("Fatal error starting daemon:", err);
    process.exit(1);
  }
})();
