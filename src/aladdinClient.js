/**
 * Aladdin Client
 * Modern replacement for node-aladdin-connect-garage-door integration
 * Uses local fetch-based Genie API module (src/genieApi.js)
 */

const { callGenie } = require("./genieApi");

/**
 * Class-based client (nice for custom scripts, not required for Matter glue)
 */
class AladdinClient {
  /**
   * Create a new AladdinClient
   * @param {Object} config
   * @param {string} config.username - Genie account email
   * @param {string} config.password - Genie account password
   * @param {number} [config.deviceNumber=0] - Device index
   * @param {number} [config.garageNumber=1] - Garage door index
   * @param {boolean} [config.debug=false] - Enable verbose logging
   * @param {string} [config.logPrefix="AladdinClient"] - Log prefix
   */
  constructor(config) {
    this.username = config.username;
    this.password = config.password;
    this.deviceNumber = config.deviceNumber || 0;
    this.garageNumber = config.garageNumber || 1;
    this.debug = config.debug || false;
    this.logPrefix = config.logPrefix || "AladdinClient";
  }

  /**
   * Internal helper to call Genie API via genieApi.js
   */
  async performAction(action) {
    if (this.debug) {
      console.log(
        `[${this.logPrefix}] Performing action "${action}" (device=${this.deviceNumber}, garage=${this.garageNumber})`
      );
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
      console.log(`[${this.logPrefix}] Action "${action}" result:`, result);
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

/**
 * Functional helpers used by src/main.js
 * Each one takes an options object:
 * {
 *   username,
 *   password,
 *   deviceNumber,
 *   garageNumber,
 *   debug,
 *   logPrefix
 * }
 */

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
