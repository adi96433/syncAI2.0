const { App } = require("@slack/bolt");
const axios = require("axios");
require("dotenv").config();

const getPrompt = (chatMessages) => `
You're an assistant designed to analyze team chat conversations and extract structured task updates.

From the following messages, do the following:

1. Identify distinct tasks, tickets, or issues that team members are discussing.
2. For each task:
   - Group all related comments, even if they're from different users.
   - Combine relevant context (e.g., if UI is blocked waiting for backend).
3. Classify each task as:
   - ✅ Completed
   - 🚧 In Progress
   - ⛔ Blocked
4. Display the output in this format:

---
**Task: [summary of ticket/feature/issue]**
Status: [Completed / In Progress / Blocked]
Details:
- User1: did X
- User2: waiting for Y
---

Now process the messages below and return only the formatted summary.

Messages:
"""
${chatMessages}
"""
`;

async function summarizeWithCohere(conversation) {
  try {
    const res = await axios.post(
      "https://api.cohere.ai/v1/chat",
      {
        model: "command-r-plus",
        message: getPrompt(conversation),
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📋 Summary:\n", res.data.text);
    return res.data.text;
  } catch (err) {
    console.error("❌ Error:", err?.response?.data || err.message);
    return err?.response?.data || err.message;
  }
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  // Socket Mode doesn't listen on a port, but in case you want your app to respond to OAuth,
  // you still need to listen on some port!
  port: process.env.PORT || 3000,
});

// Listens to all incoming messages
app.message("syncAI", async ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  console.log("message", message);
  //   await say("hi!");

  const conversation = await getFormattedConversation(message.channel);
  const summary = await summarizeWithCohere(conversation);
  await say(summary);
});

/*FETCHING MESSAGES,USERINFO */
const { WebClient } = require("@slack/web-api");
const web = new WebClient(process.env.SLACK_BOT_TOKEN);

// Caches usernames to avoid repeated API calls
const userCache = {};

// Get username from user ID (cached)
async function getUsername(userId) {
  if (userCache[userId]) return userCache[userId];

  try {
    const res = await web.users.info({ user: userId });
    const name = res.user.real_name || res.user.name;
    userCache[userId] = name;
    return name;
  } catch (err) {
    console.error("Error fetching user info:", err);
    return userId; // fallback to ID if name fails
  }
}

// Fetch all messages from a channel
async function fetchAllMessages(channelId) {
  let allMessages = [];
  let hasMore = true;
  let cursor;

  while (hasMore) {
    const res = await web.conversations.history({
      channel: channelId,
      cursor,
      limit: 200,
    });

    allMessages.push(...res.messages);
    hasMore = res.has_more;
    cursor = res.response_metadata?.next_cursor;
  }

  return allMessages;
}

// Final function to produce "User: Message" lines
async function getFormattedConversation(channelId) {
  const messages = await fetchAllMessages(channelId);
  console.log("(✅messagefetched", messages.length);

  const lines = await Promise.all(
    messages
      .reverse() // show oldest first
      .filter((msg) => msg.type === "message" && !msg.subtype)
      .map(async (msg) => {
        const username = await getUsername(msg.user);
        return `${username}: ${msg.text}`;
      })
  );

  return lines.join("\n");
}

(async () => {
  // Start your app
  await app.start();

  app.logger.info("⚡️ Bolt app is running!");

  const conversation = await getFormattedConversation("C096J4QCCH2");
  console.log("completeConv", conversation);
  summarizeWithCohere(conversation);
})();
