// index.js
// Homebridge entry point for the Aladdin Matter Daemon

const { createServer } = require("./src/main");

class AladdinMatterPlatform {
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

  configureAccessory(accessory) {
    this.log.info(
      "[AladdinMatterDaemon] configureAccessory (ignored, Matter handles devices):",
      accessory.displayName
    );
  }
}

module.exports = (api) => {
  api.registerPlatform("AladdinMatterDaemon", AladdinMatterPlatform);
};
