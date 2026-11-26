import db from "../config/db.js";
import { withTransaction } from "../utils/transaction.js";
import { LEGACY_MARKER, parseRecommendation, savedRecommendationCards } from "./aiController.js";

/* ============================================
   PROMISE WRAPPER (CRITICAL)
============================================ */
const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

/* ============================================
   SIDEBAR: LIST CONVERSATIONS
   GET /api/ai/conversations
============================================ */
export const listConversations = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.id;

    const rows = await query(
      `
      SELECT
        c.id,
        c.title,
        c.updated_at
      FROM ai_conversations c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
      LIMIT 50
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ listConversations error:", err);
    res.status(500).json({ error: "Failed to load conversations" });
  }
};



/* ============================================
   LOAD MESSAGES FOR A CONVERSATION
   GET /api/ai/conversations/:id/messages
============================================ */
export const getConversationMessages = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.id;
    const conversationId = req.params.id;

    // Ownership check
    const ownership = await query(
      `
      SELECT id
      FROM ai_conversations
      WHERE id = ? AND user_id = ?
      `,
      [conversationId, userId]
    );

    if (!ownership.length) {
      return res.status(403).json({ error: "Access denied" });
    }

    const rows = await query(
      `
      SELECT
        id,
        sender,
        message_text AS text,
        timestamp,
        feedback,
        recommendation
      FROM ai_messages
      WHERE conversation_id = ? AND message_text <> ?
      ORDER BY timestamp ASC, id ASC
      `,
      [conversationId, LEGACY_MARKER]
    );

    // Shop cards are rebuilt from the live database, so a shop that is no
    // longer verified (or a service no longer approved) drops out.
    const messages = await Promise.all(rows.map(async ({ recommendation, ...message }) => {
      const cards = await savedRecommendationCards(parseRecommendation(recommendation), userId);
      return cards ? { ...message, shops: cards.shops, handoff: cards.handoff } : message;
    }));

    res.json(messages);
  } catch (err) {
    console.error("❌ getConversationMessages error:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
};

/* ==========================
   DELETE CONVERSATION
========================== */
export const deleteConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const found = await withTransaction(async (conn) => {
      // Make sure user owns this conversation
      const [[conv]] = await conn.query(
        "SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?",
        [id, userId]
      );

      if (!conv) return false;

      // Delete messages first (FK safety)
      await conn.query("DELETE FROM ai_messages WHERE conversation_id = ?", [id]);

      // Delete conversation
      await conn.query("DELETE FROM ai_conversations WHERE id = ?", [id]);

      return true;
    });

    if (!found) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete conversation error:", err);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
};

/* ==========================
   RENAME CONVERSATION
========================== */
export const renameConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { newTitle } = req.body;

    if (!newTitle || newTitle.trim().length === 0) {
      return res.status(400).json({ error: "Title required" });
    }

    const cleanTitle = newTitle.trim().slice(0, 50);

    // updated_at is left alone: it means "last message", which the history
    // list sorts and dates by. A rename is not conversation activity.
    const result = await query(
      `UPDATE ai_conversations
       SET title = ?
       WHERE id = ? AND user_id = ?`,
      [cleanTitle, id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json({ success: true, title: cleanTitle });

  } catch (err) {
    console.error("Rename conversation error:", err);
    res.status(500).json({ error: "Failed to rename conversation" });
  }
};
