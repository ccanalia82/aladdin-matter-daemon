const aladdinGarageDoor = require("node-aladdin-connect-garage-door");

// Wrap the callback API in Promises
function runAction({ username, password, action, deviceNumber, garageNumber, debug }) {
  return new Promise((resolve, reject) => {
    try {
      aladdinGarageDoor(
        username,
        password,
        action,
        (result) => {
          resolve(result);
        },
        deviceNumber,
        garageNumber,
        debug
      );
    } catch (err) {
      reject(err);
    }
  });
}

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
  return Number.parseInt(String(battery), 10);
}

module.exports = {
  getDoorStatus,
  openDoor,
  closeDoor,
  getBattery,
};
