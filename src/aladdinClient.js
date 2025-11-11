/**
 * Aladdin Client
 * Modern replacement for node-aladdin-connect-garage-door integration
 * Uses local fetch-based Genie API module (src/genieApi.js)
 */

const { callGenie } = require("./genieApi");

class AladdinClient {
  /**
   * Create a new AladdinClient
   * @param {Object} config
   * @param {string} config.username - Genie account email
   * @param {string} config.password - Genie account password
   * @param {number} [config.deviceNumber=0] - Device index
   * @param {number} [config.garageNumber=1] - Garage door index
   * @param {boolean} [config.debug=false] - Enable verbose logging
   */
  constructor(config) {
    this.username = config.username;
    this.password = config.password;
    this.deviceNumber = config.deviceNumber || 0;
    this.garageNumber = config.garageNumber || 1;
    this.debug = config.debug || false;
  }

  /**
   * Perform an action (open, close, status) against the Genie API
   * @param {string} action - "open" | "close" | "status"
   * @param {Function} [callback] - Optional callback(err, result)
   * @returns {Promise<Object>} Response data
   */
  async performAction(action, callback) {
    if (this.debug) {
      console.log(`[AladdinClient] Performing action "${action}"...`);
    }

    try {
      const result = await callGenie({
        username: this.username,
        password: this.password,
        action,
        deviceNumber: this.deviceNumber,
        garageNumber: this.garageNumber,
        debug: this.debug,
      });

      if (this.debug) {
        console.log(`[AladdinClient] Action "${action}" result:`, result);
      }

      if (callback && typeof callback === "function") {
        callback(null, result);
      }

      return result;
    } catch (error) {
      console.error(`[AladdinClient] Error performing "${action}":`, error);

      if (callback && typeof callback === "function") {
        callback(error);
      }

      throw error;
    }
  }

  /**
   * Convenience methods
   */
  async getStatus(callback) {
    return this.performAction("status", callback);
  }

  async openDoor(callback) {
    return this.performAction("open", callback);
  }

  async closeDoor(callback) {
    return this.performAction("close", callback);
  }
}

module.exports = AladdinClient;
