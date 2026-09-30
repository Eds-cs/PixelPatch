// server/controllers/chatController.js
import db from "../config/db.js";

export const startChat = (req, res) => {
  const client_id = req.user.id;   // ⬅️ authenticated user
  const { shop_id } = req.body;

  if (!shop_id)
    return res.status(400).json({ error: "shop_id required" });

  // check existing chat
  const checkSql = `
    SELECT * FROM chats
    WHERE client_id = ? AND shop_id = ? AND is_active = 1
    LIMIT 1
  `;

  db.query(checkSql, [client_id, shop_id], (err, existing) => {
    if (err) {
      console.error("Chat check error:", err);
      return res.status(500).json({ error: "Server error" });
    }

    if (existing.length > 0) {
      return res.json({ chat: existing[0] });
    }

    const now = new Date();

    const insertSql = `
      INSERT INTO chats (client_id, shop_id, started_at, last_message_at, is_active)
      VALUES (?, ?, ?, ?, 1)
    `;

    db.query(insertSql, [client_id, shop_id, now, now], (err2, result) => {
      if (err2) {
        console.error("Chat insert error:", err2);
        return res.status(500).json({ error: "Server error" });
      }

      res.json({
        chat: {
          id: result.insertId,
          client_id,
          shop_id,
          started_at: now,
          last_message_at: now,
          is_active: 1
        }
      });
    });
  });
};
