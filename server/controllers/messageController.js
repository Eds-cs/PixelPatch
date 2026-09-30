import db from "../config/db.js";

const chatParticipantSql = `
  SELECT c.id
  FROM chats c
  JOIN shops s ON s.id = c.shop_id
  WHERE c.id = ? AND (c.client_id = ? OR s.user_id = ?)
  LIMIT 1
`;

/*
===========================================
   START CHAT (OR RETURN EXISTING)
===========================================
*/
// export const startConversation = (req, res) => {
//   const client_id = req.user.id;
//   const { request_id, shop_id } = req.body;

//   if (!shop_id) {
//     return res.status(400).json({ error: "shop_id required" });
//   }

//   const findSql = `
//     SELECT *
//     FROM chats
//     WHERE client_id = ? AND shop_id = ?
//     LIMIT 1
//   `;

//   db.query(findSql, [client_id, shop_id], (err, results) => {
//     if (err) {
//       console.log("DB ERROR startConversation:", err);
//       return res.status(500).json({ error: "Database error" });
//     }

//     if (results.length > 0) {
//       return res.json(results[0]); // existing chat
//     }

//     const createSql = `
//       INSERT INTO chats 
//         (client_id, shop_id, started_at, last_message_at, is_active)
//       VALUES (?, ?, NOW(), NOW(), 1)
//     `;

//     db.query(createSql, [client_id, shop_id], (err2, result2) => {
//       if (err2) {
//         console.log("DB ERROR createChat:", err2);
//         return res.status(500).json({ error: "Database error" });
//       }

//       return res.json({
//         id: result2.insertId,
//         client_id,
//         shop_id,
//         started_at: new Date(),
//         last_message_at: new Date(),
//         is_active: 1
//       });
//     });
//   });
// };

/*
===========================================
   SEND MESSAGE
===========================================
*/
export const sendMessage = (req, res) => {
  const sender_id = req.user.id;
  const { chat_id, message_text } = req.body;

  if (!chat_id || !message_text) {
    return res.status(400).json({ error: "chat_id and message_text required" });
  }

  db.query(chatParticipantSql, [chat_id, sender_id, sender_id], (membershipError, memberships) => {
    if (membershipError) return res.status(500).json({ error: "Database error" });
    if (memberships.length === 0) {
      return res.status(403).json({ error: "You are not a participant in this chat" });
    }

    const sql = `
      INSERT INTO chat_messages
        (chat_id, sender_id, message_text, is_read, timestamp)
      VALUES (?, ?, ?, 0, NOW())
    `;

    db.query(sql, [chat_id, sender_id, message_text], (err, result) => {
      if (err) {
        console.error("DB ERROR sendMessage:", err);
        return res.status(500).json({ error: "Database error" });
      }

      db.query(`UPDATE chats SET last_message_at = NOW() WHERE id = ?`, [chat_id]);

      return res.json({
        success: true,
        message_id: result.insertId
      });
    });
  });
};

/*
===========================================
   GET ALL MESSAGES FOR CHAT
===========================================
*/
export const getMessages = (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const sql = `
    SELECT 
      m.id,
      m.chat_id,
      m.sender_id,
      m.message_text,
      m.timestamp,
      u.first_name,
      u.last_name
    FROM chat_messages m
    JOIN users u ON u.id = m.sender_id
    JOIN chats c ON c.id = m.chat_id
    JOIN shops s ON s.id = c.shop_id
    WHERE m.chat_id = ? AND (c.client_id = ? OR s.user_id = ?)
    ORDER BY m.timestamp ASC
  `;

  db.query(sql, [id, userId, userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
};

/*
===========================================
   GET ALL CHATS FOR LOGGED-IN USER
===========================================
*/
export const getUserConversations = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      c.id,
      c.client_id,
      c.shop_id,
      c.last_message_at,

      client.first_name AS client_first,
      client.last_name AS client_last,

      s.name AS shop_name,
      s.user_id AS shop_owner_id

    FROM chats c
    JOIN users client ON client.id = c.client_id
    JOIN shops s ON s.id = c.shop_id

    WHERE c.client_id = ? OR s.user_id = ?
    ORDER BY c.last_message_at DESC
  `;

  db.query(sql, [userId, userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
};



