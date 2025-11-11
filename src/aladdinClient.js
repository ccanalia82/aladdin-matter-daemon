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
      logPrefix: this.logPrefix
    });

    if (this.debug) {
      console.log(`[${this.logPrefix}] Result for "${action}":`, result);
    }

    return result;
  }

  async getStatus() { return this.performAction("status"); }
  async openDoor() { return this.performAction("open"); }
  async closeDoor() { return this.performAction("close"); }
  async getBattery() { return this.performAction("battery"); }
}

module.exports = {
  AladdinClient,
  getDoorStatus: (cfg) => new AladdinClient(cfg).getStatus(),
  openDoor: (cfg) => new AladdinClient(cfg).openDoor(),
  closeDoor: (cfg) => new AladdinClient(cfg).closeDoor(),
  getBattery: (cfg) => new AladdinClient(cfg).getBattery()
};
