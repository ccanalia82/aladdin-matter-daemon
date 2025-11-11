// index.js
// Homebridge entry point for the Aladdin Matter Daemon

const { createServer } = require("./src/main");

class AladdinMatterPlatform {
  /**
   * @param {import('homebridge').Logging} log
   * @param {object} config
   * @param {import('homebridge').API} api
   */
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;

    if (!config) {
      this.log.warn(
        "[AladdinMatterDaemon] No config found in Homebridge. The Matter daemon will not start."
      );
      return;
    }

    this.log.info("[AladdinMatterDaemon] Initializing platform...");

    // Wait until Homebridge has finished launching before starting Matter
    api.on("didFinishLaunching", () => {
      this.startDaemon();
    });
  }

  async startDaemon() {
    try {
      this.log.info("[AladdinMatterDaemon] Starting Aladdin Matter daemon...");
      await createServer(); // Uses config.genie.json + environment vars
      this.log.info("[AladdinMatterDaemon] Aladdin Matter daemon started.");
    } catch (err) {
      this.log.error(
        "[AladdinMatterDaemon] Failed to start Aladdin Matter daemon:",
        err && err.message ? err.message : err
      );
    }
  }

  /**
   * Homebridge calls this when cached accessories are restored.
   * We don't create regular HomeKit accessories here, because the
   * actual garage door will appear to HomeKit via Matter instead.
   */
  configureAccessory(accessory) {
    this.log.info(
      "[AladdinMatterDaemon] configureAccessory (ignored, Matter handles devices):",
      accessory.displayName
    );
  }
}

/**
 * This is the function Homebridge calls when loading the plugin.
 * It must register the platform using the same alias as config.schema.json.
 */
module.exports = (api) => {
  api.registerPlatform("AladdinMatterDaemon", AladdinMatterPlatform);
};
