// routes/address.js
import express from "express";
import db from "../config/db.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -----------------------------------------------
   CREATE NEW ADDRESS
------------------------------------------------ */
router.post("/", authRequired, async (req, res) => {
  try {
    const {
      country,
      region,
      province,
      city,
      barangay,
      street,
      postal_code,
      label,
      latitude,
      longitude,
    } = req.body;

    if (!region || !province || !city || !barangay) {
      return res.status(400).json({ message: "Required address fields missing." });
    }

    const user_id = req.user.id;

    const [result] = await db.promise().query(
      `INSERT INTO addresses 
        (user_id, country, region, province, city, barangay, street, postal_code, label, latitude, longitude, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        user_id,
        country,
        region,
        province,
        city,
        barangay,
        street,
        postal_code,
        label,
        latitude,
        longitude
      ]
    );

    const newAddressId = result.insertId;

    const [rows] = await db.promise().query(
      "SELECT * FROM addresses WHERE id = ?",
      [newAddressId]
    );

    res.json({ address: rows[0] });

  } catch (err) {
    console.error("Address creation error:", err);
    res.status(500).json({ message: "Server error creating address" });
  }
});

/* -----------------------------------------------
   GET USER ADDRESSES
------------------------------------------------ */
router.get("/", authRequired, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.promise().query(
      `SELECT 
         id, user_id, country, region, province, city, barangay,
         street, postal_code, label, latitude, longitude, is_default,
         created_at, updated_at
       FROM addresses
       WHERE user_id = ?
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    res.json({ addresses: rows });

  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ message: "Server error fetching addresses" });
  }
});

export default router;
