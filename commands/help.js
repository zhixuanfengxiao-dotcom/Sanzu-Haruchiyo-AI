module.exports = {
  config: {
    name: "help",
    version: "1.0.0",
    author: "Developer",
    description: "View available bot commands",
    category: "system",
    guide: "{pn}"
  },
  onStart: async function ({ api, event, commands, config }) {
    let msg = "🌸 === SANZUBOT COMMANDS === 🌸\n\n";
    commands.forEach((cmd) => {
      msg += `• ${config.prefix}${cmd.config.name} : ${cmd.config.description}\n`;
    });
    msg += `\nUsage: ${config.prefix}<command_name>`;
    api.sendMessage(msg, event.threadID, event.messageID);
  }
};
