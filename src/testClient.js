const { AladdinClient } = require("./aladdinClient");

const client = new AladdinClient({
  username: process.env.GENIE_USER,
  password: process.env.GENIE_PASS,
  debug: true
});

(async () => {
  try {
    const status = await client.getStatus();
    console.log("Garage Door Status:", status);
  } catch (e) {
    console.error(e);
  }
})();
