// server/controllers/chatController.js
import db from "../config/db.js";
import { ownOrStaffShopIds } from "../utils/staff.js";

const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);

/**
 * The client's chat with a shop: the General chat (requestId null) or that
 * repair's own chat. Created the first time. `conn` may be a transaction.
 */
export async function findOrCreateChat({ clientId, shopId, requestId = null }) {
  const [existing] = await query(
    `SELECT * FROM chats
      WHERE client_id = ? AND shop_id = ? AND request_id <=> ? AND is_active = 1
      ORDER BY id LIMIT 1`,
    [clientId, shopId, requestId]
  );
  if (existing) return existing;
  const now = new Date();
  const result = await query(
    `INSERT INTO chats (client_id, shop_id, request_id, started_at, last_message_at, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [clientId, shopId, requestId, now, now]
  );
  return {
    id: result.insertId, client_id: clientId, shop_id: shopId, request_id: requestId,
    handler_employee_id: null, started_at: now, last_message_at: now, is_active: 1,
  };
}

// POST /api/chat/start { shop_id, request_id? }: opens the signed-in client's
// conversation with a shop, creating it the first time.
//   no request_id  the General chat (questions before booking; the owner answers)
//   request_id     that repair's own chat; it must be the caller's request at this shop
export const startChat = async (req, res) => {
  const clientId = req.user.id;
  const shopId = Number(req.body?.shop_id);
  const requestId = req.body?.request_id == null || req.body.request_id === "" ? null : Number(req.body.request_id);

  if (!Number.isInteger(shopId) || shopId <= 0) return res.status(400).json({ error: "shop_id required" });
  if (requestId !== null && (!Number.isInteger(requestId) || requestId <= 0)) {
    return res.status(400).json({ error: "Invalid request_id" });
  }

  try {
    // Only verified shops can be messaged; owners and staff can't message
    // their own shop as a customer.
    const [shop] = await query("SELECT is_verified FROM shops WHERE id = ? LIMIT 1", [shopId]);
    if (!shop || Number(shop.is_verified) !== 1) {
      return res.status(404).json({ error: "This shop isn't available for messages." });
    }
    if ((await ownOrStaffShopIds(clientId)).includes(shopId)) {
      return res.status(400).json({ error: "You can't start a chat with your own shop." });
    }

    if (requestId !== null) {
      const [own] = await query("SELECT id FROM service_requests WHERE id = ? AND client_id = ? AND shop_id = ?", [requestId, clientId, shopId]);
      if (!own) return res.status(404).json({ error: "Repair not found." });
    }

    return res.json({ chat: await findOrCreateChat({ clientId, shopId, requestId }) });
  } catch (err) {
    console.error("startChat:", err.code || err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
