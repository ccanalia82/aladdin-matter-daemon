"use strict";

const aladdinGarageDoor = require("node-aladdin-connect-garage-door");

/**
 * Wrap the callback-based node-aladdin-connect-garage-door API in a Promise.
 */
function runAction({ username, password, action, deviceNumber, garageNumber, debug, logPrefix }) {
  return new Promise((resolve, reject) => {
    aladdinGarageDoor(
      username,
      password,
      action,
      (result) => {
        if (debug && logPrefix) {
          console.log(`[${logPrefix}] Genie API response (${action}):`, result);
        }
        resolve(result);
      },
      deviceNumber,
      garageNumber,
      debug
    );
  });
}

/**
 * Normalize Genie status values to UPPERCASE strings.
 * e.g. "open", "OPEN " -> "OPEN"
 */
async function getDoorStatus(opts) {
  const status = await runAction({ ...opts, action: "status" });
  return String(status).trim().toUpperCase();
}

async function openDoor(opts) {
  const result = await runAction({ ...opts, action: "open" });
  return String(result).trim().toUpperCase();
}

async function closeDoor(opts) {
  const result = await runAction({ ...opts, action: "close" });
  return String(result).trim().toUpperCase();
}

async function getBattery(opts) {
  const battery = await runAction({ ...opts, action: "battery" });
  const parsed = Number.parseInt(String(battery), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

module.exports = {
  getDoorStatus,
  openDoor,
  closeDoor,
  getBattery,
};
