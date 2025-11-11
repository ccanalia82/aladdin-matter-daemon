const { API } = require("homebridge");

module.exports = (api) => {
  api.registerPlatform("AladdinMatterDaemon", AladdinMatterPlatform);
};

class AladdinMatterPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;

    log.info("Initializing Aladdin Matter Daemon Platform...");
    api.on("didFinishLaunching", () => {
      this.startMatterDaemon();
    });
  }

  async startMatterDaemon() {
    const { getDoorStatus } = require("./aladdinClient");

    try {
      const status = await getDoorStatus(this.config);
      this.log.info(`Garage Door Status: ${JSON.stringify(status)}`);
    } catch (err) {
      this.log.error("Failed to start Matter daemon:", err.message);
    }
  }
}
