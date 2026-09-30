import express from "express";
import db from "../config/db.js";
import { authRequired } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";


const router = express.Router();

/* ================================
   GET USER DEVICES
================================ */
router.get("/", authRequired, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT
      id,
      name,
      brand,
      model,
      serial_number,
      model_number,
      photo_url,
      created_at
    FROM devices
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("❌ GET DEVICES:", err);
      return res.status(500).json({ message: "Failed to load devices" });
    }

    return res.json({ devices: rows });
  });
});

/* ================================
   CREATE DEVICE
================================ */
router.post(
  "/",
  authRequired,
  upload.single("photo"),
  (req, res) => {
    const {
      name,
      brand,
      model,
      serial_number,
      model_number,
    } = req.body;

    const photo_url = req.file
      ? `/uploads/requests/${req.file.filename}`
      : null;

    db.query(
      `
      INSERT INTO devices
      (user_id, name, brand, model, serial_number, model_number, photo_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        req.user.id,
        name,
        brand,
        model,
        serial_number,
        model_number,
        photo_url,
      ],
      (err) => {
        if (err) {
          console.error("❌ ADD DEVICE:", err);
          return res.status(500).json({ message: "Failed to add device" });
        }

        res.status(201).json({ message: "Device added" });
      }
    );
  }
);

// UPDATE DEVICE
router.put(
  "/:id",
  authRequired,
  upload.single("photo"),
  (req, res) => {
    const { name, brand, model } = req.body;

    const photo_url = req.file
      ? `/uploads/requests/${req.file.filename}`
      : null;

    db.query(
      `
      UPDATE devices
      SET
        name = ?,
        brand = ?,
        model = ?,
        photo_url = COALESCE(?, photo_url),
        updated_at = NOW()
      WHERE id = ? AND user_id = ?
      `,
      [
        name,
        brand,
        model,
        photo_url,
        req.params.id,
        req.user.id,
      ],
      (err, result) => {
        if (err || result.affectedRows === 0) {
          return res.status(403).json({ message: "Update failed" });
        }

        res.json({ message: "Device updated" });
      }
    );
  }
);

// DELETE DEVICE
router.delete("/:id", authRequired, (req, res) => {
  db.query(
    `DELETE FROM devices WHERE id = ? AND user_id = ?`,
    [req.params.id, req.user.id],
    (err, result) => {
      if (err || result.affectedRows === 0) {
        return res.status(403).json({ message: "Delete failed" });
      }

      res.json({ message: "Device deleted" });
    }
  );
});




export default router;
