// server/utils/ai/assistant.js
// One assistant turn: system prompt + the recent conversation (personal details
// removed) -> OpenAI, with the find_shops tool. Used by the /api/ai/analyze
// controller and by scripts/aiPromptTest.js.
//
// When the model calls find_shops, its reply comes in the call's
// message_to_user and the server looks the shops up itself: one OpenAI call,
// and the model never sees (so can't invent or misquote) any shop.
//
// Nothing here writes to the database; the caller saves the result.
import OpenAI from "openai";
import "../../loadEnv.js";
import { SYSTEM_PROMPT, FIND_SHOPS_TOOL, DEVICE_TYPES, ISSUE_CATEGORIES, LEAK_REPLY, SHOPS_FALLBACK_REPLY, leaksPrompt } from "./prompt.js";
import { findShops, guessFromText } from "./findShops.js";
import { redactPersonalInfo } from "./redact.js";
import { needsShops, looksSpanish, languageHint } from "./guards.js";

export const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
// Longest message a user may send (also enforced in app/assistant.jsx).
export const MAX_MESSAGE_LENGTH = 2000;
// Messages of history sent with each request (the newest ones).
export const HISTORY_WINDOW = 16;
// Reply length cap. About 300 words: enough for a short numbered list.
const MAX_REPLY_TOKENS = 450;
// The app waits 60 seconds for a reply.
const TURN_DEADLINE_MS = 45000;
const SUMMARY_MAX = 400;

let client = null;
function openai() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 1, timeout: 20000 });
  return client;
}

/**
 * The messages sent to OpenAI. `history` is
 * [{ sender: "user"|"ai", text, shownShops?: ["Shop name", ...] }], oldest
 * first, NOT including the new message.
 */
export function buildMessages(history, userText) {
  const all = [...history, { sender: "user", text: userText }];
  const recent = all.slice(-HISTORY_WINDOW);
  const messages = [{ role: "system", content: SYSTEM_PROMPT }];

  // When older messages are left out, the first thing the user said (usually
  // the device and problem) is kept so the assistant doesn't lose the thread.
  if (all.length > recent.length) {
    const first = all.find((message) => message.sender === "user");
    if (first && !recent.includes(first)) {
      messages.push({ role: "system", content: "Older messages in this chat are left out. The user's first message in this chat follows." });
      messages.push({ role: "user", content: redactPersonalInfo(first.text) });
      messages.push({ role: "system", content: "The most recent messages follow." });
    }
  }

  recent.forEach((message, index) => {
    if (message.sender === "user") {
      // The last message is the new one: say which language to answer in.
      if (index === recent.length - 1) messages.push({ role: "system", content: languageHint(message.text) });
      messages.push({ role: "user", content: redactPersonalInfo(message.text) });
      return;
    }
    messages.push({ role: "assistant", content: String(message.text ?? "") });
    if (message.shownShops) {
      messages.push({
        role: "system",
        content: message.shownShops.length
          ? `Shops shown to the user as cards after that reply (name, service, starting price, details): ${message.shownShops.join("; ")}.`
          : "find_shops was called after that reply, but no matching shop was found.",
      });
    }
  });
  return messages;
}

// The user's own words about the problem, for the shop when the model gave no
// summary: their messages that mention a device or a problem (personal
// details removed).
function problemSummary(userTexts) {
  const relevant = userTexts.filter((text) => {
    const { deviceType, issueCategory } = guessFromText(text);
    return deviceType || issueCategory !== "OTHER";
  });
  return redactPersonalInfo(relevant.join(" ").replace(/\s+/g, " ").trim()).slice(0, SUMMARY_MAX);
}

// "I tried ..." wording. The model sometimes adds steps to the shop note that
// the user never mentioned; such sentences are dropped unless the user talked
// about trying something.
const TRIED = /\b(tried|try|trying|attempted|restarted|reset|cleaned|already|sinubukan|subukan|sinubok|tinry|na-try|natry|ginawa|nilinis|ni-restart|nirestart|na-restart)\b/i;

function keepStatedFacts(summary, userTexts) {
  if (TRIED.test(userTexts.join(" "))) return summary;
  return summary
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !TRIED.test(sentence))
    .join(" ")
    .trim();
}

function parseToolArgs(raw, conversationText) {
  let args = {};
  try { args = JSON.parse(raw || "{}"); } catch { args = {}; }
  const guessed = guessFromText(conversationText);
  const deviceType = DEVICE_TYPES.includes(args.device_type) ? args.device_type : guessed.deviceType;
  const issueCategory = ISSUE_CATEGORIES.includes(args.issue_category) ? args.issue_category : guessed.issueCategory;
  const summary = redactPersonalInfo(String(args.summary_for_shop ?? "").trim()).slice(0, SUMMARY_MAX);
  const message = String(args.message_to_user ?? "").trim();
  return { deviceType, issueCategory, summary, message };
}

/**
 * Runs one turn. Returns
 *   { reply, recommendation: { shops, device_type, issue_category, summary } | null,
 *     usage: { prompt_tokens, completion_tokens }, model, leaked? }
 * Throws when OpenAI fails or times out (the caller shows a friendly message).
 */
export async function runAssistant({ history = [], userText, userId = null }) {
  const messages = buildMessages(history, userText);
  const completion = await openai().chat.completions.create(
    {
      model: AI_MODEL,
      temperature: 0.2,
      max_completion_tokens: MAX_REPLY_TOKENS,
      messages,
      tools: [FIND_SHOPS_TOOL],
      tool_choice: "auto",
      parallel_tool_calls: false,
    },
    { signal: AbortSignal.timeout(TURN_DEADLINE_MS) }
  );
  const usage = {
    prompt_tokens: completion.usage?.prompt_tokens ?? 0,
    completion_tokens: completion.usage?.completion_tokens ?? 0,
  };
  const message = completion.choices?.[0]?.message ?? {};
  const call = message.tool_calls?.find((toolCall) => toolCall.function?.name === "find_shops");

  let reply = String(message.content ?? "").trim();
  let recommendation = null;

  const userTexts = [...history.filter((m) => m.sender === "user").map((m) => m.text), userText];

  if (call) {
    const args = parseToolArgs(call.function.arguments, userTexts.join(" "));
    const shops = await findShops({ deviceType: args.deviceType, issueCategory: args.issueCategory, userId });
    const summary = keepStatedFacts(args.summary, userTexts) || problemSummary(userTexts);
    recommendation = { shops, device_type: args.deviceType, issue_category: args.issueCategory, summary };
    reply = args.message || reply || SHOPS_FALLBACK_REPLY;
  } else if (needsShops(userText)) {
    // A hazard or a request for a person must end with shops, even when the
    // model only asked "would you like me to find a shop?".
    const { deviceType, issueCategory } = guessFromText(userTexts.join(" "));
    const shops = await findShops({ deviceType: deviceType ?? "ANY", issueCategory, userId });
    recommendation = { shops, device_type: deviceType ?? "ANY", issue_category: issueCategory, summary: problemSummary(userTexts) };
    // The cards are already showing: drop a closing "Would you like me to find a shop?".
    reply = reply.replace(/\s*(?:would|do) you (?:like|want) (?:me )?to (?:find|search|look for|help you find|recommend)[^?.!]*[?.!]?\s*$/i, "").trim() || reply;
  }

  if (!reply) throw new Error("Empty reply from OpenAI");

  // Chavacano is answered in Tagalog; a Spanish reply is rewritten.
  if (looksSpanish(reply)) {
    const rewrite = await openai().chat.completions.create(
      {
        model: AI_MODEL,
        temperature: 0,
        max_completion_tokens: MAX_REPLY_TOKENS,
        messages: [
          { role: "system", content: "Rewrite the user's text in simple, natural Tagalog (Taglish is fine for technical words). Keep the meaning, steps and numbers exactly. Output only the rewritten text." },
          { role: "user", content: reply },
        ],
      },
      { signal: AbortSignal.timeout(TURN_DEADLINE_MS) }
    );
    usage.prompt_tokens += rewrite.usage?.prompt_tokens ?? 0;
    usage.completion_tokens += rewrite.usage?.completion_tokens ?? 0;
    reply = String(rewrite.choices?.[0]?.message?.content ?? "").trim() || reply;
  }

  // Never pass on a reply that repeats the instructions.
  if (leaksPrompt(reply) || (recommendation && leaksPrompt(recommendation.summary))) {
    return { reply: LEAK_REPLY, recommendation: null, usage, model: AI_MODEL, leaked: true };
  }
  return { reply, recommendation, usage, model: AI_MODEL };
}
