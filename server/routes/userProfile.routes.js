import express from "express";
import db from "../config/db.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ----------------------------------
   GET USER PROFILE
---------------------------------- */
router.get("/", authRequired, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT
      id,
      first_name,
      last_name,
      email,
      phone,
      photo_url
    FROM users
    WHERE id = ?
    LIMIT 1
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("❌ LOAD PROFILE:", err);
      return res.status(500).json({ message: "DB error" });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: rows[0] });
  });
});

export default router;
