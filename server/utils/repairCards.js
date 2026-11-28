// server/utils/repairCards.js
// Repair cards in chat: a SYSTEM message with a `card` (JSON) that the chat
// screen draws as a card (components/RepairChatCard.jsx).
//
// REPAIR_CONFIRMED is posted in the repair's own chat when the shop accepts
// the request (confirmRepair) or a warranty repair is created (it starts
// accepted). It is a snapshot of that moment: repair number, device,
// services, delivery and address, preferred date.
//
// Never put phone numbers or emails in a card: clients and shops don't get
// each other's contact details (AGENTS.md section 25).
import db from "../config/db.js";
import { findOrCreateChat } from "../controllers/chatController.js";
import { broadcastMessage } from "../sockets/chatSocket.js";
import { hideContactInfo } from "./contactFilter.js";

const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);

const ISSUE_PREVIEW = 160;

/** A stored card as an object, or null. */
export function parseCard(value) {
  if (!value) return null;
  try {
    const card = typeof value === "string" ? JSON.parse(value) : value;
    return card && typeof card === "object" && !Array.isArray(card) ? card : null;
  } catch {
    return null;
  }
}

/** The REPAIR_CONFIRMED card for a request, or null if it doesn't exist. */
export async function buildRepairConfirmation(requestId) {
  const [row] = await query(
    `SELECT sr.id, sr.client_id, sr.shop_id, sr.delivery_method, sr.issue_description,
            DATE_FORMAT(sr.preferred_date, '%Y-%m-%d') AS preferred_date,
            s.name AS shop_name,
            d.name AS device_name, d.brand AS device_brand, d.model AS device_model,
            d.device_type, d.photo_url AS device_photo,
            CONCAT_WS(', ', NULLIF(TRIM(a.street), ''), NULLIF(TRIM(a.barangay), ''), NULLIF(TRIM(a.city), '')) AS service_address,
            CONCAT_WS(', ', NULLIF(TRIM(sa.street), ''), NULLIF(TRIM(sa.barangay), ''), NULLIF(TRIM(sa.city), '')) AS shop_address,
            (SELECT wc.request_id FROM warranty_claims wc WHERE wc.linked_request_id = sr.id LIMIT 1) AS warranty_of
       FROM service_requests sr
       JOIN shops s ON s.id = sr.shop_id
       LEFT JOIN devices d ON d.id = sr.device_id
       LEFT JOIN addresses a ON a.id = sr.pickup_address_id
       LEFT JOIN addresses sa ON sa.id = s.address_id
      WHERE sr.id = ?
      LIMIT 1`,
    [requestId]
  );
  if (!row) return null;
  const services = await query(
    `SELECT ss.name FROM service_request_items sri JOIN shop_services ss ON ss.id = sri.service_id
      WHERE sri.request_id = ? ORDER BY ss.name`,
    [requestId]
  );
  const issue = hideContactInfo(String(row.issue_description ?? "")).trim();
  const photo = String(row.device_photo ?? "");

  return {
    row,
    card: {
      type: "REPAIR_CONFIRMED",
      request_id: row.id,
      shop_name: row.shop_name,
      device: {
        name: row.device_name || null,
        brand: row.device_brand || null,
        model: row.device_model || null,
        type: row.device_type || null,
        // Only an uploaded file or an https image, never inline data.
        photo_url: photo.startsWith("/uploads/") || photo.startsWith("https://") ? photo : null,
      },
      services: services.map((s) => s.name),
      issue: issue.length > ISSUE_PREVIEW ? `${issue.slice(0, ISSUE_PREVIEW - 1)}…` : issue,
      delivery_method: row.delivery_method,
      // Where the job happens: the client's address for pickup and on-site,
      // the shop's for drop-off. Both are already on the repair page.
      address: row.delivery_method === "DROPOFF" ? row.shop_address || null : row.service_address || null,
      preferred_date: row.preferred_date,
      warranty_of: row.warranty_of ?? null,
    },
  };
}

/**
 * Posts the "Repair confirmed" card in the repair's chat (created if needed)
 * and sends it to anyone with the chat open. Best effort: a problem here never
 * fails the action that triggered it.
 */
export async function postRepairConfirmation(requestId, actorUserId) {
  try {
    const built = await buildRepairConfirmation(requestId);
    if (!built) return;
    const { row, card } = built;
    const chat = await findOrCreateChat({ clientId: row.client_id, shopId: row.shop_id, requestId: row.id });
    const text = `${card.warranty_of ? "Warranty repair" : "Repair"} #${row.id} confirmed by ${row.shop_name}.`;
    const [result] = await db.promise().query(
      `INSERT INTO chat_messages (chat_id, sender_id, sender_kind, sender_label, message_text, card, is_read, timestamp)
       VALUES (?, ?, 'SYSTEM', NULL, ?, ?, 0, NOW())`,
      [chat.id, actorUserId, text, JSON.stringify(card)]
    );
    await db.promise().query("UPDATE chats SET last_message_at = NOW() WHERE id = ?", [chat.id]);
    const [message] = await query(
      `SELECT id, chat_id, sender_id, sender_kind, sender_label, message_text, card, timestamp
         FROM chat_messages WHERE id = ?`,
      [result.insertId]
    );
    broadcastMessage({ ...message, card: parseCard(message.card) });
  } catch (err) {
    console.error("repair confirmation card:", err.code || err.message);
  }
}
