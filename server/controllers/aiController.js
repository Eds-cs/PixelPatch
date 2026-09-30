// controllers/aiController.js
import OpenAI from "openai";
import db from "../config/db.js";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ======================================================
   PROMISE QUERY WRAPPER (SINGLE CONNECTION SAFE)
====================================================== */

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

/* ======================================================
   HELPERS (UNCHANGED LOGIC)
====================================================== */

const wordMatch = (text = "", words = []) => {
  const lower = (text || "").toLowerCase();
  return words.some(w => {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp("\\b" + escaped + "\\b", "i");
    return pattern.test(lower);
  });
};

const deviceToCategory = (text = "") => {
  const smartphone = ["phone","mobile","android","iphone","smartphone","screen","lcd","battery","charging","charging port"];
  const desktop = ["desktop","pc","motherboard","hard drive","hdd","ssd","not turning on"];
  const tablet = ["tablet","ipad","galaxy tab"];
  const controller = ["controller","joy-con","joystick","drift"];

  if (wordMatch(text, smartphone)) return "SMARTPHONE";
  if (wordMatch(text, tablet)) return "TABLET";
  if (wordMatch(text, controller)) return "CONTROLLER";
  if (wordMatch(text, desktop)) return "DESKTOP";
  return null;
};

const inferServiceName = (text = "") => {
  const keywords = [
    { key: "Screen Replacement", words: ["screen","lcd","display","cracked"] },
    { key: "Battery Replacement", words: ["battery","not charging","battery drain"] },
    { key: "Water Damage Diagnostic", words: ["water","liquid","wet"] },
    { key: "Charging Port Repair", words: ["charging port","usb port"] },
    { key: "Controller Drift Repair", words: ["drift","joystick"] },
    { key: "Laptop Motherboard Repair", words: ["motherboard","no power","won't boot"] },
    { key: "Phone Diagnostics", words: ["diagnostic","unknown issue"] }
  ];

  for (const k of keywords) {
    if (wordMatch(text, k.words)) return k.key;
  }
  return null;
};

/* ======================================================
   MAIN CONTROLLER (FULL LOGIC PRESERVED)
====================================================== */

export const analyzeIssue = async (req, res) => {
  try {
    const userId = req.user.id;
    const { text, conversation_id } = req.body;

    if (!text || text.trim().length < 2) {
      return res.status(400).json({ error: "Message required" });
    }

    // 🔒 BEGIN TRANSACTION
    await query("START TRANSACTION");

    /* --------------------------------------------------
       1️⃣ RESOLVE / CREATE CONVERSATION
    -------------------------------------------------- */
    let conversationId = conversation_id;

    if (!conversationId) {
      const result = await query(
        `INSERT INTO ai_conversations
        (user_id, title, ai_confidence, created_at, updated_at)
        VALUES (?, 'New Chat', 0, NOW(), NOW())`,
        [userId]
      );

      conversationId = result.insertId;

      // After insert, set default title like "Chat #ID"
      await query(
        `UPDATE ai_conversations
        SET title = CONCAT('Chat #', ?)
        WHERE id = ?`,
        [conversationId, conversationId]
      );
    }

    /* --------------------------------------------------
       2️⃣ LOAD FULL CONTEXT FROM DB
    -------------------------------------------------- */
    const dbMessages = await query(
      `SELECT sender, message_text
       FROM ai_messages
       WHERE conversation_id = ?
       ORDER BY timestamp ASC`,
      [conversationId]
    );

    const history = dbMessages.map(m => ({
      sender: m.sender,
      text: m.message_text
    }));

    history.push({ sender: "user", text });

    /* --------------------------------------------------
       3️⃣ STORE USER MESSAGE
    -------------------------------------------------- */
    await query(
      `INSERT INTO ai_messages (conversation_id, sender, message_text, timestamp)
       VALUES (?, 'user', ?, NOW())`,
      [conversationId, text]
    );

    /* --------------------------------------------------
       4️⃣ CALL OPENAI
    -------------------------------------------------- */
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `
          You are PixelPatch AI.
          Be a friendly technician. Ask one question at a time.
          Avoid recommending shops until troubleshooting is exhausted
          or the user explicitly asks.
          `
        },
        ...history.map(m => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text
        }))
      ]
    });

    const aiReply = completion.choices?.[0]?.message?.content || "";

    await query(
      `INSERT INTO ai_messages (conversation_id, sender, message_text, timestamp)
       VALUES (?, 'ai', ?, NOW())`,
      [conversationId, aiReply]
    );

    /* --------------------------------------------------
       5️⃣ SHOULD WE RECOMMEND SHOPS?
    -------------------------------------------------- */
    const recentUsers = history.filter(h => h.sender === "user").slice(-4);
    const combinedText = recentUsers.map(m => m.text).join(" ");

    const explicitAsk = wordMatch(combinedText, [
      "shop","shops","recommend","near me","technician","service center"
    ]);

    const problemDetected = wordMatch(combinedText, [
      "screen","battery","charging","dead","no power","water","drift"
    ]);

    const assistantHints = history
      .filter(h => h.sender === "ai")
      .filter(h => wordMatch(h.text, ["try","check","restart","reset"]))
      .length;

    const shouldRecommend =
      explicitAsk || (problemDetected && assistantHints >= 2);

    if (!shouldRecommend) {
      await query("COMMIT");
      return res.json({ conversation_id: conversationId, reply: aiReply, shops: [] });
    }

    /* --------------------------------------------------
       6️⃣ PREVENT DUPLICATE RECOMMENDATIONS
    -------------------------------------------------- */
    const existingSystem = await query(
      `SELECT id FROM ai_messages
       WHERE conversation_id = ?
       AND message_text LIKE '[SYSTEM] Recommended shops%'`,
      [conversationId]
    );

    if (existingSystem.length) {
      await query("COMMIT");
      return res.json({ conversation_id: conversationId, reply: aiReply, shops: [] });
    }

    /* --------------------------------------------------
       7️⃣ SHOP MATCHING
    -------------------------------------------------- */
    const serviceCategory = deviceToCategory(combinedText);
    const guessedService = inferServiceName(combinedText);

    let sql = `
      SELECT s.id, s.name, s.rating_average,
             a.street, a.barangay, a.province, a.region, a.country
      FROM shops s
      JOIN addresses a ON a.id = s.address_id
      JOIN shop_services ss ON ss.shop_id = s.id
      WHERE s.is_verified = 1
    `;
    const params = [];

    if (serviceCategory) {
      sql += " AND ss.category = ?";
      params.push(serviceCategory);
    } else if (guessedService) {
      sql += " AND ss.name LIKE ?";
      params.push(`%${guessedService.split(" ")[0]}%`);
    }

    sql += " GROUP BY s.id ORDER BY s.rating_average DESC LIMIT 10";

    const rows = await query(sql, params);

    const shops = rows.map(r => ({
      id: r.id,
      name: r.name,
      rating_average: Number(r.rating_average) || 0,
      address: [r.street,r.barangay,r.province,r.region,r.country]
        .filter(Boolean)
        .join(", ")
    }));

    /* --------------------------------------------------
       8️⃣ SYSTEM MESSAGE + CONFIDENCE UPDATE
    -------------------------------------------------- */
    await query(
      `INSERT INTO ai_messages (conversation_id, sender, message_text, timestamp)
       VALUES (?, 'ai', '[SYSTEM] Recommended shops', NOW())`,
      [conversationId]
    );

    await query(
      `UPDATE ai_conversations
       SET ai_confidence = ?, updated_at = NOW()
       WHERE id = ?`,
      [Math.min(1, shops.length / 5), conversationId]
    );

    console.log("🚨 analyzeIssue response shape:", {
      conversation_id: conversationId,
      reply: aiReply,
      shopsCount: shops.length
    });

    
    return res.json({ conversation_id: conversationId, reply: aiReply, shops });

  } catch (err) {
    await query("ROLLBACK");
    console.error("AI ERROR:", err);
    return res.status(500).json({ error: "AI processing error" });
  }
};
