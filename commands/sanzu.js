module.exports = {
  config: {
    name: "sanzu",
    version: "1.0.0",
    author: "Developer",
    description: "Talk to Sanzu Haruchiyo AI",
    category: "ai",
    guide: "{pn} <your message>"
  },
  onStart: async function ({ api, event, args, config }) {
    const promptText = args.join(" ");
    if (!promptText) {
      return api.sendMessage("Tch, what do you want? Say something.", event.threadID, event.messageID);
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.aiModel)}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`;

    const systemInstruction = `You are Sanzu Haruchiyo from Tokyo Revengers.
PERSONALITY: Unhinged, fiercely loyal to Mikey/Bonten, sarcastic, aggressive, dangerous, but unexpectedly affectionate/protective toward the user.
RULES: Speak informally and directly. Never say you are an AI or virtual assistant. Keep replies concise and in-character.`;

    const payload = {
      contents: [
        { role: "user", parts: [{ text: systemInstruction }] },
        { role: "model", parts: [{ text: "Got it. What do you want?" }] },
        { role: "user", parts: [{ text: promptText }] }
      ]
    };

    try {
      api.sendTypingIndicator(event.threadID, () => {});
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Tch, I have nothing to say.";
      api.sendMessage(reply, event.threadID, event.messageID);
    } catch (e) {
      console.error("[Sanzu Command Error]:", e);
      api.sendMessage("Tch, API error or invalid key...", event.threadID, event.messageID);
    }
  }
};
