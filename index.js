const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { saveMessage, getHistory, clearHistory, saveUserProfile } = require("./firebase");
require("dotenv").config();

// ─── Initialize ───
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are Lyra, a smart and friendly Telegram assistant.

YOUR RULES:
1. Answer ANY question accurately and completely.
2. For current/factual questions (weather, news, sports, people, prices), use Google Search grounding to get real data.
3. At the end of every factual answer, ALWAYS add a relevant clickable link:
   🔗 [Search Google](https://www.google.com/search?q=URL_ENCODED_QUERY)
   Example: if asked about PM of India → 🔗 [Search Google](https://www.google.com/search?q=Prime+Minister+of+India+2025)
4. Use **bold** for important names/facts.
5. Keep answers concise but complete (2-5 sentences for simple facts).
6. Remember previous messages in this conversation.
7. Be warm, helpful, and conversational.
8. If asked who made you, say "I'm Lyra, your personal Telegram assistant!"`;

// ─── Get AI response with history ───
async function askGemini(chatId, userText) {
  const history = await getHistory(chatId);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ googleSearch: {} }],
  });

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userText);
  const text = result.response.text();
  return text || "Sorry, I couldn't get an answer. Please try again.";
}

// ─── Format for Telegram ───
function formatForTelegram(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "*$1*")
    .replace(/#{1,3} (.*)/g, "*$1*")
    .slice(0, 4000);
}

// ─── /start ───
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "there";

  await saveUserProfile(chatId, {
    firstName: msg.from.first_name,
    lastName: msg.from.last_name || "",
    username: msg.from.username || "",
    chatId: chatId,
    startedAt: new Date().toISOString(),
  });

  await bot.sendMessage(
    chatId,
    `👋 *Hello ${name}! I'm Lyra* 🤖\n\n` +
    `I can answer *anything* you ask:\n` +
    `• 🌤️ Weather updates\n` +
    `• 📰 Latest news\n` +
    `• 🏏 Sports scores\n` +
    `• 👤 Facts about people\n` +
    `• 💡 Any question!\n\n` +
    `I give direct answers *+ source links* and remember our full conversation! 🧠\n\n` +
    `Just type your question ⬇️`,
    { parse_mode: "Markdown" }
  );
});

// ─── /help ───
bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `📖 *Sage AI Help*\n\n` +
    `*Commands:*\n` +
    `/start - Welcome message\n` +
    `/clear - Clear chat history\n` +
    `/history - Show history count\n` +
    `/help - This help message\n\n` +
    `*Try asking me:*\n` +
    `➡️ Who is the Prime Minister of India?\n` +
    `➡️ Weather in Chennai today\n` +
    `➡️ Latest IPL 2025 score\n` +
    `➡️ What is quantum computing?\n` +
    `➡️ Top movies of 2025`,
    { parse_mode: "Markdown" }
  );
});

// ─── /clear ───
bot.onText(/\/clear/, async (msg) => {
  await clearHistory(msg.chat.id);
  await bot.sendMessage(
    msg.chat.id,
    `🗑️ *Chat history cleared!*\n\nStarting fresh. Ask me anything!`,
    { parse_mode: "Markdown" }
  );
});

// ─── /history ───
bot.onText(/\/history/, async (msg) => {
  const history = await getHistory(msg.chat.id);
  if (history.length === 0) {
    return bot.sendMessage(msg.chat.id, "📭 No chat history yet. Start asking questions!");
  }
  await bot.sendMessage(
    msg.chat.id,
    `📚 *You have ${history.length} messages in history.*\n\nUse /clear to reset.`,
    { parse_mode: "Markdown" }
  );
});

// ─── Main message handler ───
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text || text.startsWith("/")) return;

  await bot.sendChatAction(chatId, "typing");

  try {
    const answer = await askGemini(chatId, text);
    const formatted = formatForTelegram(answer);

    await saveMessage(chatId, "user", text);
    await saveMessage(chatId, "assistant", answer);

    await bot.sendMessage(chatId, formatted, {
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    });
  } catch (err) {
    console.error("❌ Error:", err.message);
    await bot.sendMessage(chatId, `⚠️ Error: ${err.message}\n\nPlease try again or use /clear to reset.`);
  }
});

// ─── Voice ───
bot.on("voice", async (msg) => {
  await bot.sendMessage(msg.chat.id, "🎙️ Voice not supported yet — please type your question!");
});

// ─── Errors ───
bot.on("polling_error", (err) => console.error("Polling error:", err.message));
process.on("uncaughtException", (err) => console.error("Uncaught:", err.message));

console.log("✅ Lyra Bot is LIVE!");
console.log("📱 Open Telegram and chat with your bot.");
console.log("🛑 Press Ctrl+C to stop.\n");
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Lyra Telegram Bot Running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});