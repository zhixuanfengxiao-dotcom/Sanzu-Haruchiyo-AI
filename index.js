const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const login = require("ws3-fca");

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, "config.json");

// Load Configuration
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig = {
      fbstate: "",
      geminiApiKey: "",
      aiModel: "gemini-1.5-flash",
      authorizedUserId: "",
      prefix: "!"
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function saveConfigData(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

// Load GoatBot Commands Dynamically
const commands = new Map();
function loadCommands() {
  commands.clear();
  const commandsDir = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true });
  }

  const files = fs.readdirSync(commandsDir).filter((file) => file.endsWith(".js"));
  for (const file of files) {
    try {
      const commandPath = path.join(commandsDir, file);
      delete require.cache[require.resolve(commandPath)];
      const command = require(commandPath);
      if (command.config && command.config.name) {
        commands.set(command.config.name.toLowerCase(), command);
      }
    } catch (e) {
      console.error(`Failed to load command file ${file}:`, e.message);
    }
  }
  console.log(`[GoatBot Framework] Loaded ${commands.size} commands.`);
}

// Setup Express Web Dashboard
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  res.render("dashboard", { config: loadConfig() });
});

app.post("/save-config", (req, res) => {
  const { fbstate, geminiApiKey, aiModel, authorizedUserId, prefix } = req.body;

  saveConfigData({
    fbstate: fbstate.trim(),
    geminiApiKey: geminiApiKey.trim(),
    aiModel: aiModel.trim() || "gemini-1.5-flash",
    authorizedUserId: authorizedUserId.trim(),
    prefix: prefix.trim() || "!"
  });

  res.send(`
    <style>
      body { background: #0d0d11; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; }
      .card { background: #16161e; padding: 30px; border-radius: 8px; text-align: center; border: 1px solid #ff3366; }
    </style>
    <div class="card">
      <h2>Settings Saved!</h2>
      <p>Restarting Sanzubot Engine...</p>
      <script>setTimeout(() => { window.location.href = '/'; }, 2000);</script>
    </div>
  `);

  startBotEngine();
});

let activeStopListener = null;

function startBotEngine() {
  if (activeStopListener && typeof activeStopListener === "function") {
    console.log("[Sanzubot] Stopping previous bot instance...");
    activeStopListener();
    activeStopListener = null;
  }

  const config = loadConfig();
  if (!config.fbstate || !config.geminiApiKey) {
    console.log("[Sanzubot] Missing FBState or API Key. Complete setup at http://localhost:" + PORT);
    return;
  }

  let parsedState;
  try {
    parsedState = JSON.parse(config.fbstate);
  } catch (err) {
    console.error("[Sanzubot] Invalid JSON string in FBState.");
    return;
  }

  console.log("[Sanzubot] Attempting Facebook Login...");

  login({ appState: parsedState }, (err, api) => {
    if (err) {
      console.error("[Sanzubot] Login error:", err.message || err);
      return;
    }

    console.log("[Sanzubot] Login successful! Sanzu AI is now active.");

    api.setOptions({
      listenEvents: true,
      selfListen: false,
      forceLogin: true
    });

    activeStopListener = api.listenMqtt(async (listenErr, event) => {
      if (listenErr) return;

      if (event.type === "message" || event.type === "message_reply") {
        if (config.authorizedUserId && String(event.senderID) !== String(config.authorizedUserId)) {
          return;
        }

        const body = (event.body || "").trim();
        const prefix = config.prefix || "!";

        if (!body.startsWith(prefix)) return;

        const args = body.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const command = commands.get(commandName);
        if (command) {
          try {
            await command.onStart({ api, event, args, commands, config });
          } catch (cmdError) {
            console.error(`[Command Error] Issue executing ${commandName}:`, cmdError);
            api.sendMessage("Tch, something went wrong executing that command.", event.threadID, event.messageID);
          }
        }
      }
    });
  });
}

// Launch Application
loadCommands();
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`Sanzubot Dashboard Online: http://localhost:${PORT}`);
  console.log(`=================================================`);
  startBotEngine();
});
