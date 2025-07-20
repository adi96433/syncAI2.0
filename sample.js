const exampleMessage = {
  user: "U096DFZLSB0",
  type: "message",
  ts: "1752932425.622709",
  client_msg_id: "31273fe3-bb60-4ed0-ab48-0cb3c3651438",
  text:
    "Test SSO is blocked at backend currently.\n" +
    "we are waiting for backend to get merged.",
  team: "T096DFZLM7G",
  blocks: [{ type: "rich_text", block_id: "DO9pR", elements: [Array] }],
  channel: "C096J4QCCH2",
  event_ts: "1752932425.622709",
  channel_type: "channel",
};

const prompt = `You're an assistant designed to analyze team chat conversations and extract structured task updates.

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
[PASTE MESSAGES HERE]
"""`;
