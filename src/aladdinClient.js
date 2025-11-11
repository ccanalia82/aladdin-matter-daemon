const { callGenie } = require("./genieApi");

class AladdinClient {
  constructor(config) {
    this.username = config.username;
    this.password = config.password;
    this.deviceNumber = config.deviceNumber || 0;
    this.garageNumber = config.garageNumber || 1;
    this.debug = config.debug || false;
    this.logPrefix = config.logPrefix || "AladdinClient";
  }

  async performAction(action) {
    if (this.debug) {
      console.log(`[${this.logPrefix}] Performing "${action}"...`);
    }

    const result = await callGenie({
      username: this.username,
      password: this.password,
      action,
      deviceNumber: this.deviceNumber,
      garageNumber: this.garageNumber,
      debug: this.debug,
      logPrefix: this.logPrefix,
    });

    if (this.debug) {
      console.log(`[${this.logPrefix}] Result for "${action}":`, result);
    }

    return result;
  }

  async getStatus() {
    return this.performAction("status");
  }

  async openDoor() {
    return this.performAction("open");
  }

  async closeDoor() {
    return this.performAction("close");
  }

  async getBattery() {
    return this.performAction("battery");
  }
}

async function getDoorStatus(options) {
  const client = new AladdinClient(options);
  return client.getStatus();
}

async function openDoor(options) {
  const client = new AladdinClient(options);
  return client.openDoor();
}

async function closeDoor(options) {
  const client = new AladdinClient(options);
  return client.closeDoor();
}

async function getBattery(options) {
  const client = new AladdinClient(options);
  return client.getBattery();
}

module.exports = {
  AladdinClient,
  getDoorStatus,
  openDoor,
  closeDoor,
  getBattery,
};
