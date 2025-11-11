/**
 * aladdinClient.js
 *
 * Provides a lightweight, object-oriented wrapper around the lower-level
 * Genie API calls defined in `genieApi.js`.
 *
 * This class abstracts actions like "open", "close", "status", and "battery"
 * into clean async methods for easier use by both the Matter daemon and
 * Homebridge platform.
 *
 * The class uses dependency injection via the `config` object for credentials
 * and runtime options such as debugging.
 */

const { callGenie } = require("./genieApi");

class AladdinClient {
  /**
   * Create a new AladdinClient instance.
   * @param {Object} config - Client configuration
   * @param {string} config.username - Genie account email
   * @param {string} config.password - Genie account password
   * @param {number} [config.deviceNumber=0] - Device index from Genie API
   * @param {number} [config.garageNumber=1] - Garage door index under device
   * @param {boolean} [config.debug=false] - Enables verbose logging
   * @param {string} [config.logPrefix="AladdinClient"] - Prefix for logs
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
   * Core action handler used internally by all other methods.
   * @param {"status"|"open"|"close"|"battery"} action
   * @returns {Promise<Object>} Genie API response
   */
  async performAction(action) {
    if (this.debug) {
      console.log(`[${this.logPrefix}] Performing "${action}"...`);
    }

    // Delegate to the low-level API client
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

  /**
   * Retrieve the current door status.
   * @returns {Promise<Object>}
   */
  async getStatus() {
    return this.performAction("status");
  }

  /**
   * Command the garage door to open.
   * @returns {Promise<Object>}
   */
  async openDoor() {
    return this.performAction("open");
  }

  /**
   * Command the garage door to close.
   * @returns {Promise<Object>}
   */
  async closeDoor() {
    return this.performAction("close");
  }

  /**
   * Retrieve battery information for the door’s controller.
   * @returns {Promise<Object>}
   */
  async getBattery() {
    return this.performAction("battery");
  }
}

/**
 * Exports both the class and simple one-off helpers for convenience.
 * The helpers allow calling actions without manually instantiating a client.
 */
module.exports = {
  AladdinClient,
  getDoorStatus: (cfg) => new AladdinClient(cfg).getStatus(),
  openDoor: (cfg) => new AladdinClient(cfg).openDoor(),
  closeDoor: (cfg) => new AladdinClient(cfg).closeDoor(),
  getBattery: (cfg) => new AladdinClient(cfg).getBattery(),
};
