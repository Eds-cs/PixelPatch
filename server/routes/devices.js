// routes/device.js
import express from "express";
import db from "../config/db.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET USER DEVICES
router.get("/", authRequired, async (req, res) => {
  try {
    const userId = req.user.id; // NOW WORKS 🎉

    const [rows] = await db.promise().query(
      `SELECT id, user_id, name, model, serial_number, model_number, brand, created_at, updated_at
       FROM devices
       WHERE user_id = ?`,
      [userId]
    );

    res.json({ devices: rows });

  } catch (error) {
    console.error("Error fetching devices:", error);
    res.status(500).json({ message: "Server error fetching devices" });
  }
});

export default router;
