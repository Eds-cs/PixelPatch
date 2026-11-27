// server/sockets/chatSocket.js
// Live chat. Who may join and send is decided by utils/chatAccess.js (client,
// owner, or the employee a repair chat was handed to). Messages are saved
// with the sender's badge (sender_kind, sender_label) and contact details
// hidden (utils/contactFilter.js).
import jwt from "jsonwebtoken";
import { isSuspended } from "../utils/accountStatus.js";
import db from "../config/db.js";
import { LIMITS, textProblem } from "../utils/inputLimits.js";
import { maskContactInfo, CONTACT_HIDDEN_NOTICE } from "../utils/contactFilter.js";
import { chatAccess, CHAT_HANDED_OVER_MESSAGE } from "../utils/chatAccess.js";

const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);

let ioRef = null;

/** Sends a saved message row to everyone in the chat's room. */
export function broadcastMessage(message) {
  if (ioRef && message?.chat_id) ioRef.to(`chat_${message.chat_id}`).emit("new_message", message);
}

/** Tells open chat screens to reload the chat's state (transfer, take back). */
export function broadcastChatUpdate(chatId) {
  if (ioRef && chatId) ioRef.to(`chat_${chatId}`).emit("chat_updated", { chat_id: Number(chatId) });
}

/** Saves a message from `access` (chatAccess result) and returns the row. */
export async function saveChatMessage(access, senderId, typed) {
  const { text, masked } = maskContactInfo(typed);
  const result = await query(
    `INSERT INTO chat_messages (chat_id, sender_id, sender_kind, sender_label, message_text, is_read, timestamp)
     VALUES (?, ?, ?, ?, ?, 0, NOW())`,
    [access.chat.id, senderId, access.kind, access.label, text]
  );
  await query("UPDATE chats SET last_message_at = NOW() WHERE id = ?", [access.chat.id]);
  const [row] = await query(
    `SELECT m.id, m.chat_id, m.sender_id, m.sender_kind, m.sender_label, m.message_text, m.timestamp,
            u.first_name, u.last_name
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
      WHERE m.id = ?`,
    [result.insertId]
  );
  // Shop-side messages show the badge only (first name + role), never the
  // sender's last name.
  if (row && row.sender_kind !== "CLIENT") row.last_name = null;
  return { row, masked };
}

export default function setupChatSockets(io) {
  ioRef = io;

  io.use(async (socket, next) => {
    // expect token sent in auth: { token } from client
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(new Error("Invalid token"));
    }
    // Suspended accounts can't chat (utils/accountStatus.js).
    if (await isSuspended(decoded.id)) return next(new Error("Account suspended"));
    socket.user = decoded; // { id, role_id, ... }
    return next();
  });

  io.on("connection", (socket) => {
    // Join a chat room
    socket.on("join", async (chatId) => {
      if (!chatId) return;
      try {
        if (!(await chatAccess(chatId, socket.user.id))) return;
      } catch (err) {
        console.error("Chat membership check failed:", err.code || err.message);
        return;
      }
      socket.join(`chat_${Number(chatId)}`);
    });

    socket.on("leave", (chatId) => {
      socket.leave(`chat_${Number(chatId)}`);
    });

    // payload: { chat_id, message_text }
    socket.on("send_message", async (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      try {
        const senderId = socket.user.id;
        const { chat_id, message_text: typed } = payload || {};

        if (!chat_id || !typed) return reply({ success: false, error: "chat_id and message_text required" });
        // Same limit as POST /chat/send (utils/inputLimits.js).
        const textIssue = textProblem({ message_text: typed }, { message_text: ["Message", LIMITS.chatMessage] });
        if (textIssue) return reply({ success: false, error: textIssue.message, code: "TEXT_TOO_LONG" });

        const access = await chatAccess(chat_id, senderId);
        if (!access) return reply({ success: false, error: "You are not a participant in this chat" });
        if (!access.canSend) return reply({ success: false, error: CHAT_HANDED_OVER_MESSAGE, code: "CHAT_HANDED_OVER" });

        const { row, masked } = await saveChatMessage(access, senderId, typed);
        broadcastMessage(row);
        return reply({ success: true, message: row, ...(masked ? { masked: true, notice: CONTACT_HIDDEN_NOTICE } : {}) });
      } catch (err) {
        console.error("socket send_message error:", err.code || err.message);
        return reply({ success: false, error: "Server error" });
      }
    });
  });
}
