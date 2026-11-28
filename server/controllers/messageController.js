// controllers/messageController.js
// REST side of client-shop chat (the socket is sockets/chatSocket.js).
//
//   GET  /api/chat                 the caller's conversations (as client, owner or staff)
//   GET  /api/chat/:id             one conversation's state (role, can send, handler, transfer)
//   GET  /api/chat/:id/messages    its messages, with sender badges
//   POST /api/chat/send            send a message
//
// Access: utils/chatAccess.js. A client has one General chat per shop
// (request_id NULL) and one chat per repair.
import db from "../config/db.js";
import { hideContactInfo, CONTACT_HIDDEN_NOTICE } from "../utils/contactFilter.js";
import { chatAccess, CHAT_HANDED_OVER_MESSAGE } from "../utils/chatAccess.js";
import { membershipFor, senderLabel, OWNER_ROLE_LABEL } from "../utils/staff.js";
import { saveChatMessage, broadcastMessage } from "../sockets/chatSocket.js";
import { parseCard } from "../utils/repairCards.js";

const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);

/* POST /api/chat/send { chat_id, message_text } */
export const sendMessage = async (req, res) => {
  const senderId = req.user.id;
  const { chat_id, message_text: typed } = req.body ?? {};
  if (!chat_id || !typed) return res.status(400).json({ error: "chat_id and message_text required" });

  try {
    const access = await chatAccess(chat_id, senderId);
    if (!access) return res.status(403).json({ error: "You are not a participant in this chat" });
    if (!access.canSend) return res.status(409).json({ error: CHAT_HANDED_OVER_MESSAGE, code: "CHAT_HANDED_OVER" });

    const { row, masked } = await saveChatMessage(access, senderId, typed);
    broadcastMessage(row);
    return res.json({
      success: true,
      message_id: row.id,
      message_text: row.message_text,
      message: row,
      ...(masked ? { masked: true, notice: CONTACT_HIDDEN_NOTICE } : {}),
    });
  } catch (err) {
    console.error("sendMessage:", err.code || err.message);
    return res.status(500).json({ error: "The message could not be sent." });
  }
};

/* GET /api/chat/:id/messages */
export const getMessages = async (req, res) => {
  try {
    const access = await chatAccess(req.params.id, req.user.id);
    if (!access) return res.status(404).json({ error: "Conversation not found" });
    const { chat } = access;

    const rows = await query(
      `SELECT m.id, m.chat_id, m.sender_id, m.sender_kind, m.sender_label, m.message_text, m.card, m.timestamp,
              u.first_name, u.last_name
         FROM chat_messages m
         LEFT JOIN users u ON u.id = m.sender_id
        WHERE m.chat_id = ?
        ORDER BY m.timestamp ASC, m.id ASC`,
      [chat.id]
    );
    const ownerLabel = senderLabel(chat.owner_first, OWNER_ROLE_LABEL);
    res.json(rows.map((row) => {
      // Messages from before badges were saved: the client or the owner.
      const kind = row.sender_kind ?? (String(row.sender_id) === String(chat.client_id) ? "CLIENT" : "OWNER");
      const label = row.sender_label ?? (kind === "OWNER" ? ownerLabel : null);
      return {
        ...row,
        sender_kind: kind,
        sender_label: label,
        // Shop-side messages show the badge (first name + role) only.
        last_name: kind === "CLIENT" ? row.last_name : null,
        // Also hides contact details in messages saved before the filter existed.
        message_text: hideContactInfo(row.message_text),
        // A repair card (utils/repairCards.js), drawn by the chat screen.
        card: parseCard(row.card),
      };
    }));
  } catch (err) {
    console.error("getMessages:", err.code || err.message);
    return res.status(500).json({ error: "Couldn't load the messages." });
  }
};

/* GET /api/chat/:id
   { id, request_id, shop_id, shop_name, client_name, as, can_send, handler,
     repair: { id, device_name, status } | null,
     transfer: { employee_id, label } | null   (owner only: who it can be handed to) } */
export const getChatState = async (req, res) => {
  try {
    const access = await chatAccess(req.params.id, req.user.id);
    if (!access) return res.status(404).json({ error: "Conversation not found" });
    const { chat } = access;

    const [client] = await query("SELECT first_name, last_name FROM users WHERE id = ?", [chat.client_id]);
    let repair = null;
    let transfer = null;
    if (chat.request_id) {
      const [row] = await query(
        `SELECT sr.id, sr.status, d.name AS device_name,
                ra.employee_id, se.first_name, se.role, se.user_id, se.is_active
           FROM service_requests sr
           LEFT JOIN devices d ON d.id = sr.device_id
           LEFT JOIN request_assignments ra ON ra.request_id = sr.id
           LEFT JOIN shop_employees se ON se.id = ra.employee_id
          WHERE sr.id = ?`,
        [chat.request_id]
      );
      if (row) {
        repair = { id: row.id, status: row.status, device_name: row.device_name };
        // The owner can hand a repair chat to the employee assigned to that
        // repair, once that employee has joined with an account.
        if (access.as === "OWNER" && row.employee_id && row.user_id && Number(row.is_active) === 1 &&
            Number(row.employee_id) !== Number(chat.handler_employee_id)) {
          transfer = { employee_id: row.employee_id, label: senderLabel(row.first_name, row.role) };
        }
      }
    }

    return res.json({
      id: chat.id,
      request_id: chat.request_id,
      shop_id: chat.shop_id,
      shop_name: chat.shop_name,
      client_name: [client?.first_name, client?.last_name].filter(Boolean).join(" ") || "Client",
      as: access.as,
      can_send: access.canSend,
      handler: access.handler ? { label: access.handler.label } : null,
      owner_label: senderLabel(chat.owner_first, OWNER_ROLE_LABEL),
      repair,
      transfer,
    });
  } catch (err) {
    console.error("getChatState:", err.code || err.message);
    return res.status(500).json({ error: "Couldn't load this conversation." });
  }
};

/* GET /api/chat
   Every conversation the caller is part of, each with viewer_role
   (CLIENT, OWNER or STAFF). The app shows CLIENT chats on the customer side,
   OWNER chats in the business portal and STAFF chats in the staff portal. */
export const getUserConversations = async (req, res) => {
  const userId = req.user.id;
  try {
    const membership = await membershipFor(userId);
    const staffEmployeeId = membership?.usable ? membership.employeeId : -1;

    const rows = await query(
      `SELECT c.id, c.client_id, c.shop_id, c.request_id, c.handler_employee_id, c.started_at, c.last_message_at,
              latest.id AS last_message_id,
              latest.message_text AS last_message_text,
              latest.sender_id AS last_sender_id,
              latest.sender_kind AS last_sender_kind,
              latest.timestamp AS last_message_timestamp,
              client.first_name AS client_first,
              client.last_name AS client_last,
              s.name AS shop_name,
              s.user_id AS shop_owner_id,
              sr.status AS request_status,
              d.name AS device_name,
              he.first_name AS handler_first,
              he.role AS handler_role
         FROM chats c
         JOIN users client ON client.id = c.client_id
         JOIN shops s ON s.id = c.shop_id
         LEFT JOIN service_requests sr ON sr.id = c.request_id
         LEFT JOIN devices d ON d.id = sr.device_id
         LEFT JOIN shop_employees he ON he.id = c.handler_employee_id
         LEFT JOIN chat_messages latest ON latest.id = (
           SELECT recent.id FROM chat_messages recent
            WHERE recent.chat_id = c.id
            ORDER BY recent.timestamp DESC, recent.id DESC LIMIT 1
         )
        WHERE c.client_id = ? OR s.user_id = ? OR c.handler_employee_id = ?
        ORDER BY COALESCE(latest.timestamp, c.started_at) DESC, c.id DESC`,
      [userId, userId, staffEmployeeId]
    );

    const me = String(userId);
    res.json(rows.map((row) => {
      const viewerRole = String(row.client_id) === me ? "CLIENT" : String(row.shop_owner_id) === me ? "OWNER" : "STAFF";
      const { handler_first, handler_role, ...chat } = row;
      return {
        ...chat,
        viewer_role: viewerRole,
        handler_label: row.handler_employee_id ? senderLabel(handler_first, handler_role) : null,
        last_message_text: row.last_message_text ? hideContactInfo(row.last_message_text) : row.last_message_text,
      };
    }));
  } catch (err) {
    console.error("getUserConversations:", err.code || err.message);
    return res.status(500).json({ error: "Couldn't load your conversations." });
  }
};
