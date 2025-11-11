// index.js
// Homebridge entry point for the Aladdin Matter Daemon.
//
// This file does NOT implement any HomeKit accessories directly.
// Instead, it bootstraps the Matter daemon (src/main.js) as a
// "sidecar" process inside Homebridge. The real garage door then
// shows up in HomeKit via Matter, not via the Homebridge bridge.

const { createServer } = require("./src/main");

class AladdinMatterPlatform {
  /**
   * @param {import('homebridge').Logging} log
   * @param {object} config - Platform section from Homebridge config.json
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

    // Wait until Homebridge has finished restoring cached accessories etc.
    api.on("didFinishLaunching", () => {
      this.startDaemon();
    });
  }

  /**
   * Start the Matter.js server from src/main.js.
   * We intentionally ignore the Homebridge platform config for now
   * and continue to use config.genie.json + env vars as the source
   * of truth for Genie credentials.
   */
  async startDaemon() {
    try {
      this.log.info("[AladdinMatterDaemon] Starting Aladdin Matter daemon...");
      await createServer();
      this.log.info("[AladdinMatterDaemon] Aladdin Matter daemon started.");
    } catch (err) {
      this.log.error(
        "[AladdinMatterDaemon] Failed to start Aladdin Matter daemon:",
        err && err.message ? err.message : err
      );
    }
  }

  /**
   * Homebridge calls this for cached accessories. We don't manage
   * any regular HomeKit accessories here (Matter handles devices),
   * so this is effectively a no-op with a log for debugging.
   */
  configureAccessory(accessory) {
    this.log.info(
      "[AladdinMatterDaemon] configureAccessory (ignored, Matter handles devices):",
      accessory.displayName
    );
  }
}

/**
 * This is the function Homebridge calls when loading the plugin module.
 * We must register the platform using the same alias as config.schema.json.
 */
module.exports = (api) => {
  api.registerPlatform("AladdinMatterDaemon", AladdinMatterPlatform);
};
