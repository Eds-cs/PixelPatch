// server/sockets/chatSocket.js
import jwt from "jsonwebtoken";
import { isSuspended } from "../utils/accountStatus.js";
import db from "../config/db.js";
import { LIMITS, textProblem } from "../utils/inputLimits.js";
import { maskContactInfo, CONTACT_HIDDEN_NOTICE } from "../utils/contactFilter.js";

const isChatParticipant = (chatId, userId) =>
  new Promise((resolve, reject) => {
    db.query(
      `
        SELECT c.id
        FROM chats c
        JOIN shops s ON s.id = c.shop_id
        WHERE c.id = ? AND (c.client_id = ? OR s.user_id = ?)
        LIMIT 1
      `,
      [chatId, userId, userId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows.length > 0);
      }
    );
  });

export default function setupChatSockets(io) {
  io.use(async (socket, next) => {
    // expect token sent in auth: { token } from client
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return next(new Error("Invalid token"));
    }
    // Suspended accounts can't chat (utils/accountStatus.js).
    if (await isSuspended(decoded.id)) return next(new Error("Account suspended"));
    socket.user = decoded; // { id, role_id, ... }
    return next();
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id, "user:", socket.user.id);

    // Join a chat room
    socket.on("join", async (chatId) => {
      if (!chatId) return;
      try {
        if (!(await isChatParticipant(chatId, socket.user.id))) return;
      } catch (err) {
        console.error("Chat membership check failed:", err);
        return;
      }
      const room = `chat_${chatId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined ${room}`);
    });

    // Leave a chat room (optional)
    socket.on("leave", (chatId) => {
      const room = `chat_${chatId}`;
      socket.leave(room);
    });

    // Receive a send_message event from client
    // payload: { chat_id, message_text }
    socket.on("send_message", async (payload, ack) => {
      try {
        const sender_id = socket.user.id;
        const { chat_id, message_text: typed } = payload || {};

        if (!chat_id || !typed) {
          if (ack) ack({ success: false, error: "chat_id and message_text required" });
          return;
        }
        // Same limit as POST /chat/send (utils/inputLimits.js).
        const textIssue = textProblem({ message_text: typed }, { message_text: ["Message", LIMITS.chatMessage] });
        if (textIssue) {
          if (ack) ack({ success: false, error: textIssue.message, code: "TEXT_TOO_LONG" });
          return;
        }

        if (!(await isChatParticipant(chat_id, sender_id))) {
          if (ack) ack({ success: false, error: "You are not a participant in this chat" });
          return;
        }

        // Contact details are hidden before the message is saved, so the
        // other side never receives them (utils/contactFilter.js).
        const { text: message_text, masked } = maskContactInfo(typed);

        // Insert into DB
        const insertSql = `
          INSERT INTO chat_messages
            (chat_id, sender_id, message_text, is_read, timestamp)
          VALUES (?, ?, ?, 0, NOW())
        `;
        db.query(insertSql, [chat_id, sender_id, message_text], (err, result) => {
          if (err) {
            console.error("DB ERROR socket send_message insert:", err);
            if (ack) ack({ success: false, error: "Database error" });
            return;
          }

          const messageId = result.insertId;

          // Fetch the inserted row plus sender info to broadcast
          const fetchSql = `
            SELECT m.id, m.chat_id, m.sender_id, m.message_text, m.timestamp, u.first_name, u.last_name
            FROM chat_messages m
            JOIN users u ON u.id = m.sender_id
            WHERE m.id = ?
            LIMIT 1
          `;

          db.query(fetchSql, [messageId], (err2, rows) => {
            if (err2) {
              console.error("DB ERROR fetch inserted message:", err2);
              if (ack) ack({ success: false, error: "Database error" });
              return;
            }

            const messageRow = rows[0];

            // Update chats.last_message_at
            db.query(`UPDATE chats SET last_message_at = NOW() WHERE id = ?`, [chat_id]);

            // Broadcast to room
            const room = `chat_${chat_id}`;
            io.to(room).emit("new_message", messageRow);

            if (ack) ack({ success: true, message: messageRow, ...(masked ? { masked: true, notice: CONTACT_HIDDEN_NOTICE } : {}) });
          });
        });
      } catch (err) {
        console.error("socket send_message error:", err);
        if (ack) ack({ success: false, error: "Server error" });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", socket.id, reason);
    });
  });
}
