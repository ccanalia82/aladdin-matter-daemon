/**
 * index.js
 *
 * Homebridge entry point for the Aladdin Matter Daemon plugin.
 *
 * This file registers the `AladdinMatterDaemon` platform with Homebridge,
 * allowing the Matter.js daemon (in `src/main.js`) to start automatically
 * once Homebridge has fully initialized.
 *
 * Responsibilities:
 * - Define the Homebridge platform class.
 * - Listen for Homebridge's `didFinishLaunching` event.
 * - Spawn the Matter daemon via `createServer()` from src/main.js.
 *
 * The Matter daemon handles all Genie API communication and publishes
 * the garage door as a Matter On/Off device, discoverable by Apple Home,
 * Google Home, or Alexa controllers.
 */

const { createServer } = require("./src/main");

/**
 * Main Homebridge platform class.
 *
 * @class
 * @param {Function} log - Homebridge logging function.
 * @param {Object} config - Plugin configuration object (from config.schema.json).
 * @param {API} api - Homebridge API instance.
 */
class AladdinMatterPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;

    // Validate configuration presence
    if (!config) {
      this.log.warn(
        "[AladdinMatterDaemon] No config found in Homebridge. The Matter daemon will not start."
      );
      return;
    }

    this.log.info("[AladdinMatterDaemon] Initializing platform...");

    // Wait for Homebridge to finish launching before starting the Matter daemon.
    api.on("didFinishLaunching", () => {
      this.startDaemon();
    });
  }

  /**
   * Start the Aladdin Matter daemon.
   *
   * This method invokes `createServer()` from src/main.js, which:
   *  - Reads configuration from config.genie.json or environment variables.
   *  - Launches a local Matter.js server representing the Genie garage door.
   *  - Publishes it for pairing with Matter controllers.
   */
  async startDaemon() {
    try {
      this.log.info("[AladdinMatterDaemon] Starting Aladdin Matter daemon...");
      await createServer(); // Uses config.genie.json + environment variables
      this.log.info("[AladdinMatterDaemon] Aladdin Matter daemon started.");
    } catch (err) {
      this.log.error(
        "[AladdinMatterDaemon] Failed to start Aladdin Matter daemon:",
        err && err.message ? err.message : err
      );
    }
  }

  /**
   * Required Homebridge method.
   * Called for cached accessories when Homebridge restarts.
   * Since Matter manages its own devices, this is informational only.
   *
   * @param {PlatformAccessory} accessory - Homebridge accessory instance.
   */
  configureAccessory(accessory) {
    this.log.info(
      "[AladdinMatterDaemon] configureAccessory (ignored, Matter handles devices):",
      accessory.displayName
    );
  }
}

/**
 * Register the platform plugin with Homebridge.
 *
 * Homebridge calls this exported function at load time to associate
 * the alias `AladdinMatterDaemon` with the platform class above.
 *
 * @param {API} api - Homebridge API instance.
 */
module.exports = (api) => {
  api.registerPlatform("AladdinMatterDaemon", AladdinMatterPlatform);
};
