// controllers/aiController.js
// The AI troubleshooting assistant (app/assistant.jsx).
//
//   POST /api/ai/analyze                 { text, conversation_id? }  one message
//   POST /api/ai/shops                   { conversation_id? }        shops for "Talk to a shop" (no OpenAI)
//   PUT  /api/ai/messages/:id/feedback   { feedback: "UP"|"DOWN"|null }
//
// The prompt, the tool and the OpenAI call live in utils/ai/. Users only ever
// see and continue their own conversations.
import db from "../config/db.js";
import { withTransaction } from "../utils/transaction.js";
import { runAssistant, AI_MODEL, MAX_MESSAGE_LENGTH } from "../utils/ai/assistant.js";
import { findShops, guessFromText } from "../utils/ai/findShops.js";
import { checkLimits, startUsage, finishUsage, DAILY_LIMIT, WINDOW_LIMIT, WINDOW_MINUTES } from "../utils/ai/limits.js";
import { UNAVAILABLE_MESSAGE } from "../utils/ai/prompt.js";
import { redactPersonalInfo } from "../utils/ai/redact.js";

const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);

// Older chats stored this marker row instead of ai_messages.recommendation.
// server/sql/2026-11-26_ai_assistant.sql deletes them; this keeps any left
// over (e.g. before the migration runs) out of the history.
export const LEGACY_MARKER = "[SYSTEM] Recommended shops";

export function parseRecommendation(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value && Array.isArray(value.shop_ids) ? value : null;
  } catch {
    return null;
  }
}

// "TechFix Pro (Screen Replacement from PHP 1500, 2-3 hours, rated 2.8 from 4 reviews, Tetuan)"
const cardNote = (shop) => {
  const details = [
    `${shop.service.name} from PHP ${shop.service.price}`,
    shop.service.timeframe,
    shop.review_count ? `rated ${shop.rating} from ${shop.review_count} review${shop.review_count === 1 ? "" : "s"}` : "no reviews yet",
    shop.barangay,
  ].filter(Boolean);
  return `${shop.name} (${details.join(", ")})`;
};

const handoffOf = (rec) => ({
  summary: rec.summary || "",
  device_type: rec.device_type || null,
  issue_category: rec.issue_category || null,
});

/** Rebuilds a saved recommendation's cards from the live database. */
export async function savedRecommendationCards(saved, userId) {
  if (!saved) return null;
  const shops = await findShops({
    deviceType: saved.device_type,
    issueCategory: saved.issue_category,
    userId,
    shopIds: saved.shop_ids.map(Number).filter(Number.isInteger),
  });
  return { shops, handoff: handoffOf(saved) };
}

async function ownedConversation(conversationId, userId) {
  const rows = await query("SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?", [conversationId, userId]);
  return rows.length > 0;
}

/**
 * Shops for a conversation without calling OpenAI: the latest recommendation
 * in it, or a guess from what the user wrote, or (no chat yet) the best-rated
 * shops for any device.
 */
async function conversationShops(conversationId, userId, pendingText = "") {
  let userText = [];
  if (conversationId) {
    const rows = await query(
      `SELECT sender, message_text, recommendation FROM ai_messages
        WHERE conversation_id = ? ORDER BY timestamp ASC, id ASC`,
      [conversationId]
    );
    const latest = [...rows].reverse().map((row) => parseRecommendation(row.recommendation)).find(Boolean);
    if (latest) {
      const cards = await savedRecommendationCards(latest, userId);
      if (cards.shops.length) return cards;
    }
    userText = rows.filter((row) => row.sender === "user").map((row) => row.message_text);
  }
  // The message that couldn't be sent (daily limit) counts too.
  if (pendingText) userText.push(pendingText);
  if (userText.length) {
    const { deviceType, issueCategory } = guessFromText(userText.join(" "));
    const shops = await findShops({ deviceType, issueCategory, userId });
    return { shops, handoff: { summary: redactPersonalInfo(userText[0]).slice(0, 400), device_type: deviceType, issue_category: issueCategory } };
  }
  const shops = await findShops({ deviceType: null, issueCategory: "OTHER", userId });
  return { shops, handoff: { summary: "", device_type: null, issue_category: null } };
}

const positiveId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/* ======================================================
   POST /api/ai/analyze
====================================================== */
export const analyzeIssue = async (req, res) => {
  const userId = req.user.id;
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const askedId = req.body?.conversation_id;
  let conversationId = askedId ? positiveId(askedId) : null;

  if (text.length < 2) return res.status(400).json({ error: "Type a message first." });
  if (text.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`, code: "AI_MESSAGE_TOO_LONG" });
  }
  if (askedId && !conversationId) return res.status(404).json({ error: "Conversation not found" });

  let usageId = null;
  try {
    /* 1. Context (reads only) */
    let history = [];
    if (conversationId) {
      if (!(await ownedConversation(conversationId, userId))) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const rows = await query(
        `SELECT sender, message_text, recommendation FROM ai_messages
          WHERE conversation_id = ? AND message_text <> ?
          ORDER BY timestamp ASC, id ASC`,
        [conversationId, LEGACY_MARKER]
      );
      // shownShops: the shop names that were on the cards, so the model can
      // talk about them in follow-ups without ever naming others.
      history = rows.map((row) => {
        const rec = parseRecommendation(row.recommendation);
        return { sender: row.sender, text: row.message_text, ...(rec ? { shownShops: rec.shop_notes ?? rec.shop_names ?? [] } : {}) };
      });
    }

    /* 2. Limits */
    const limit = await checkLimits(userId);
    if (!limit.ok) {
      res.set("Retry-After", String(limit.retryAfterSeconds));
      if (limit.code === "AI_DAILY_LIMIT") {
        const { shops, handoff } = await conversationShops(conversationId, userId, text);
        return res.status(429).json({
          code: "AI_DAILY_LIMIT",
          error: `You've used today's ${DAILY_LIMIT} free assistant messages. You can chat again tomorrow.`,
          limit: DAILY_LIMIT,
          shops,
          handoff,
        });
      }
      const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
      return res.status(429).json({
        code: "AI_RATE_LIMIT",
        error: `You've sent ${WINDOW_LIMIT} messages in ${WINDOW_MINUTES} minutes. Please wait about ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`,
        retry_after_seconds: limit.retryAfterSeconds,
      });
    }

    /* 3. OpenAI, before any write and outside any transaction, so no pooled
          connection is held during the round trip. */
    usageId = await startUsage(userId, conversationId, AI_MODEL);
    let result;
    try {
      result = await runAssistant({ history, userText: text, userId });
    } catch (err) {
      console.error("AI ERROR:", { name: err.name, code: err.code, status: err.status, message: err.message });
      await finishUsage(usageId, { ok: false, userId, model: AI_MODEL, conversationId });
      usageId = null;
      return res.status(503).json({ error: UNAVAILABLE_MESSAGE, code: "AI_UNAVAILABLE" });
    }

    const rec = result.recommendation;
    const savedRec = rec
      ? JSON.stringify({
          shop_ids: rec.shops.map((shop) => shop.id),
          shop_names: rec.shops.map((shop) => shop.name),
          // What the cards showed, for follow-up questions ("which is cheaper?").
          shop_notes: rec.shops.map(cardNote),
          device_type: rec.device_type,
          issue_category: rec.issue_category,
          summary: rec.summary,
        })
      : null;

    /* 4. Save, in one transaction */
    const saved = await withTransaction(async (conn) => {
      if (!conversationId) {
        const [created] = await conn.query(
          // issue_category is NOT NULL with no default; strict SQL modes
          // (the Docker MariaDB) refuse the row without it.
          `INSERT INTO ai_conversations
          (user_id, title, issue_category, ai_confidence, created_at, updated_at)
          VALUES (?, 'New Chat', '', 0, NOW(), NOW())`,
          [userId]
        );
        conversationId = created.insertId;
        await conn.query("UPDATE ai_conversations SET title = CONCAT('Chat #', ?) WHERE id = ?", [conversationId, conversationId]);
      }

      const [userRow] = await conn.query(
        "INSERT INTO ai_messages (conversation_id, sender, message_text, timestamp) VALUES (?, 'user', ?, NOW())",
        [conversationId, text]
      );
      const [aiRow] = await conn.query(
        "INSERT INTO ai_messages (conversation_id, sender, message_text, recommendation, timestamp) VALUES (?, 'ai', ?, ?, NOW())",
        [conversationId, result.reply, savedRec]
      );

      // updated_at = time of the last message (the history list sorts by it).
      await conn.query(
        `UPDATE ai_conversations
            SET updated_at = NOW(),
                issue_category = COALESCE(?, issue_category),
                ai_confidence = COALESCE(?, ai_confidence)
          WHERE id = ?`,
        [rec?.issue_category ?? null, rec ? Math.min(1, rec.shops.length / 3) : null, conversationId]
      );
      return { userMessageId: userRow.insertId, messageId: aiRow.insertId };
    });

    await finishUsage(usageId, { ok: true, usage: result.usage, userId, model: result.model, conversationId });
    usageId = null;

    return res.json({
      conversation_id: conversationId,
      reply: result.reply,
      message_id: saved.messageId,
      user_message_id: saved.userMessageId,
      shops: rec?.shops ?? [],
      handoff: rec ? handoffOf(rec) : null,
      remaining_today: Math.max(0, limit.remainingToday - 1),
    });
  } catch (err) {
    console.error("AI ERROR:", { code: err.code, status: err.status, message: err.message });
    if (usageId) await finishUsage(usageId, { ok: false, userId, model: AI_MODEL, conversationId });
    return res.status(500).json({ error: UNAVAILABLE_MESSAGE, code: "AI_UNAVAILABLE" });
  }
};

/* ======================================================
   POST /api/ai/shops   ("Talk to a shop"; no OpenAI)
====================================================== */
export const recommendShops = async (req, res) => {
  const userId = req.user.id;
  const askedId = req.body?.conversation_id;
  const conversationId = askedId ? positiveId(askedId) : null;
  try {
    if (askedId && (!conversationId || !(await ownedConversation(conversationId, userId)))) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    return res.json(await conversationShops(conversationId, userId));
  } catch (err) {
    console.error("AI shops error:", err.code || err.message);
    return res.status(500).json({ error: "Couldn't load shops right now." });
  }
};

/* ======================================================
   PUT /api/ai/messages/:id/feedback
====================================================== */
export const setFeedback = async (req, res) => {
  const userId = req.user.id;
  const messageId = positiveId(req.params.id);
  const value = req.body?.feedback ?? null;
  if (!messageId) return res.status(404).json({ error: "Message not found" });
  if (value !== null && value !== "UP" && value !== "DOWN") {
    return res.status(400).json({ error: "Feedback must be UP, DOWN or null." });
  }
  try {
    const [result] = await db.promise().query(
      `UPDATE ai_messages m
         JOIN ai_conversations c ON c.id = m.conversation_id
          SET m.feedback = ?
        WHERE m.id = ? AND m.sender = 'ai' AND c.user_id = ?`,
      [value, messageId, userId]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Message not found" });
    return res.json({ success: true, feedback: value });
  } catch (err) {
    console.error("AI feedback error:", err.code || err.message);
    return res.status(500).json({ error: "Couldn't save your feedback." });
  }
};
