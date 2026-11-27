// server/controllers/chatController.js
import db from "../config/db.js";

const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);

// POST /api/chat/start { shop_id, request_id? }: opens the signed-in user's
// conversation with a shop, creating it the first time. A client can message
// a shop before sending any repair request (update brief B3).
//
// request_id (optional): ties the conversation to that repair. It must be the
// caller's own request at this shop. Sending a request also ties an existing
// conversation to it (routes/serviceRequests.js).
export const startChat = async (req, res) => {
  const clientId = req.user.id;
  const shopId = Number(req.body?.shop_id);
  const requestId = req.body?.request_id == null || req.body.request_id === "" ? null : Number(req.body.request_id);

  if (!Number.isInteger(shopId) || shopId <= 0) return res.status(400).json({ error: "shop_id required" });
  if (requestId !== null && (!Number.isInteger(requestId) || requestId <= 0)) {
    return res.status(400).json({ error: "Invalid request_id" });
  }

  try {
    // Only verified shops can be messaged, and owners can't message their own shop.
    const [shop] = await query("SELECT user_id, is_verified FROM shops WHERE id = ? LIMIT 1", [shopId]);
    if (!shop || Number(shop.is_verified) !== 1) {
      return res.status(404).json({ error: "This shop isn't available for messages." });
    }
    if (String(shop.user_id) === String(clientId)) {
      return res.status(400).json({ error: "You can't start a chat with your own shop." });
    }

    if (requestId !== null) {
      const [own] = await query("SELECT id FROM service_requests WHERE id = ? AND client_id = ? AND shop_id = ?", [requestId, clientId, shopId]);
      if (!own) return res.status(404).json({ error: "Repair not found." });
    }

    const [existing] = await query(
      "SELECT * FROM chats WHERE client_id = ? AND shop_id = ? AND is_active = 1 ORDER BY id LIMIT 1",
      [clientId, shopId]
    );
    if (existing) {
      if (requestId !== null && Number(existing.request_id) !== requestId) {
        await query("UPDATE chats SET request_id = ? WHERE id = ?", [requestId, existing.id]);
        existing.request_id = requestId;
      }
      return res.json({ chat: existing });
    }

    const now = new Date();
    const result = await query(
      `INSERT INTO chats (client_id, shop_id, request_id, started_at, last_message_at, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [clientId, shopId, requestId, now, now]
    );
    return res.json({
      chat: { id: result.insertId, client_id: clientId, shop_id: shopId, request_id: requestId, started_at: now, last_message_at: now, is_active: 1 },
    });
  } catch (err) {
    console.error("startChat:", err.code || err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
