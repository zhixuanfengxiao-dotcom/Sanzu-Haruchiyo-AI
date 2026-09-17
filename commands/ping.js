module.exports = {
  config: {
    name: "ping",
    version: "1.0.0",
    author: "Developer",
    description: "Check response latency",
    category: "system",
    guide: "{pn}"
  },
  onStart: async function ({ api, event }) {
    const startTime = Date.now();
    api.sendMessage("Checking latency...", event.threadID, (err, info) => {
      if (!err) {
        const ping = Date.now() - startTime;
        api.sendMessage(`Pong! Response speed: ${ping}ms`, event.threadID, info.messageID);
      }
    });
  }
};
