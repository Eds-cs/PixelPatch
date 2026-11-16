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
      created_at,
      -- Devices referenced by a repair request cannot be deleted (FK).
      (SELECT COUNT(*) FROM service_requests sr WHERE sr.device_id = devices.id) AS request_count
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
// Text columns are NOT NULL, so empty optional fields are stored as "".
router.put(
  "/:id",
  authRequired,
  upload.single("photo"),
  (req, res) => {
    const text = (value) => String(value ?? "").trim();
    const name = text(req.body.name);

    if (!name) {
      return res.status(400).json({ message: "Give the device a name." });
    }

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
        serial_number = ?,
        model_number = ?,
        photo_url = COALESCE(?, photo_url),
        updated_at = NOW()
      WHERE id = ? AND user_id = ?
      `,
      [
        name,
        text(req.body.brand),
        text(req.body.model),
        text(req.body.serial_number),
        text(req.body.model_number),
        photo_url,
        req.params.id,
        req.user.id,
      ],
      (err, result) => {
        if (err) {
          console.error("❌ UPDATE DEVICE:", { code: err.code });
          return res.status(500).json({ message: "Couldn't update this device." });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Device not found" });
        }

        res.json({ message: "Device updated" });
      }
    );
  }
);

// DELETE DEVICE
// A device used by any repair request is part of that repair's record and
// cannot be removed (service_requests.device_id is a foreign key).
router.delete("/:id", authRequired, async (req, res) => {
  try {
    const [[device]] = await db.promise().query(
      `SELECT d.id,
              (SELECT COUNT(*) FROM service_requests sr WHERE sr.device_id = d.id) AS request_count
       FROM devices d
       WHERE d.id = ? AND d.user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    if (Number(device.request_count) > 0) {
      return res.status(409).json({
        message: "This device is part of a repair request, so it can't be deleted. You can still edit its details.",
      });
    }

    await db.promise().query(
      `DELETE FROM devices WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );

    res.json({ message: "Device deleted" });
  } catch (err) {
    console.error("❌ DELETE DEVICE:", { code: err.code });
    res.status(500).json({ message: "Couldn't delete this device." });
  }
});




export default router;
