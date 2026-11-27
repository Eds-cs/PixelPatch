// server/utils/chatAccess.js
// Who may read and write a client-shop chat (AGENTS.md section 25).
//
//   CLIENT  the chat's client: reads, writes.
//   OWNER   the shop's owner: reads every chat of the shop; writes only while
//           the chat is NOT handed to an employee (they press "Take back").
//   STAFF   the employee the owner handed this repair chat to: reads, writes.
//           A usable membership is required (shop verified, owner active).
//
// Anyone else gets null. Every chat read or send (socket and REST) goes
// through chatAccess.
import db from "../config/db.js";
import { membershipFor, senderLabel, OWNER_ROLE_LABEL } from "./staff.js";

const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);

export const CHAT_HANDED_OVER_MESSAGE = "This chat is handled by your staff. Take it back to reply.";

/**
 * Returns null (no access) or
 * { chat, as: "CLIENT"|"OWNER"|"STAFF", canSend, kind, label, handler }
 * where kind/label are what a message sent now is saved with, and handler is
 * { employeeId, firstName, role, label } or null.
 */
export async function chatAccess(chatId, userId) {
  const id = Number(chatId);
  if (!Number.isInteger(id) || id <= 0 || !userId) return null;
  const [chat] = await query(
    `SELECT c.id, c.client_id, c.shop_id, c.request_id, c.handler_employee_id, c.transferred_at,
            s.user_id AS owner_id, s.name AS shop_name, owner.first_name AS owner_first,
            he.user_id AS handler_user_id, he.first_name AS handler_first, he.role AS handler_role,
            he.is_active AS handler_active
       FROM chats c
       JOIN shops s ON s.id = c.shop_id
       JOIN users owner ON owner.id = s.user_id
       LEFT JOIN shop_employees he ON he.id = c.handler_employee_id
      WHERE c.id = ?
      LIMIT 1`,
    [id]
  );
  if (!chat) return null;

  const handler = chat.handler_employee_id
    ? {
        employeeId: chat.handler_employee_id,
        firstName: chat.handler_first,
        role: chat.handler_role,
        label: senderLabel(chat.handler_first, chat.handler_role),
      }
    : null;
  const me = String(userId);

  if (String(chat.client_id) === me) {
    return { chat, as: "CLIENT", canSend: true, kind: "CLIENT", label: null, handler };
  }
  if (String(chat.owner_id) === me) {
    return {
      chat,
      as: "OWNER",
      canSend: !handler,
      kind: "OWNER",
      label: senderLabel(chat.owner_first, OWNER_ROLE_LABEL),
      handler,
    };
  }
  if (handler && String(chat.handler_user_id) === me && Number(chat.handler_active) === 1) {
    const membership = await membershipFor(userId);
    if (membership?.usable && Number(membership.employeeId) === Number(chat.handler_employee_id)) {
      return { chat, as: "STAFF", canSend: true, kind: "STAFF", label: handler.label, handler };
    }
  }
  return null;
}
