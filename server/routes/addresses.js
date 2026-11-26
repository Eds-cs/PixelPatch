// routes/address.js
import express from "express";
import db from "../config/db.js";
import { authRequired } from "../middleware/authMiddleware.js";
import { withTransaction } from "../utils/transaction.js";
import { SERVICE_AREA, SERVICE_AREA_MESSAGE, canonicalBarangay } from "../utils/serviceArea.js";

import { LIMITS, limitText } from "../utils/inputLimits.js";

const router = express.Router();

const ADDRESS_TEXT = limitText({
  street: ["Street", LIMITS.addressLine],
  label: ["Label", LIMITS.addressLabel],
  postal_code: ["Postal code", LIMITS.postalCode],
  barangay: ["Barangay", LIMITS.addressLine],
});

/* -----------------------------------------------
   CREATE NEW ADDRESS
------------------------------------------------ */
router.post("/", authRequired, ADDRESS_TEXT, async (req, res) => {
  try {
    const { barangay, street, postal_code, label, latitude, longitude } = req.body;

    // PixelPatch only serves Zamboanga City: the barangay must be one of its
    // barangays, and the city, province, region and country are always ours.
    const validBarangay = canonicalBarangay(barangay);
    if (!validBarangay) {
      return res.status(400).json({ message: SERVICE_AREA_MESSAGE });
    }
    const text = (value) => String(value ?? "").trim();

    const user_id = req.user.id;

    // Coordinates are optional: no screen collects them yet. Store NULL
    // (unknown) rather than a fake 0,0 location.
    const coordinate = (value, limit) => {
      if (value === null || value === undefined || value === "") return null;
      const number = Number(value);
      return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
    };
    const lat = coordinate(latitude, 90);
    const lng = coordinate(longitude, 180);

    // A user's first address becomes their default.
    const [[{ hasDefault }]] = await db.promise().query(
      "SELECT EXISTS (SELECT 1 FROM addresses WHERE user_id = ? AND is_default = 1) AS hasDefault",
      [user_id]
    );

    const [result] = await db.promise().query(
      `INSERT INTO addresses
        (user_id, country, region, province, city, barangay, street, postal_code, label, latitude, longitude, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        user_id,
        SERVICE_AREA.country,
        SERVICE_AREA.region,
        SERVICE_AREA.province,
        SERVICE_AREA.city,
        validBarangay,
        text(street) || null,
        text(postal_code) || SERVICE_AREA.postal_code,
        text(label) || null,
        lat === null || lng === null ? null : lat,
        lat === null || lng === null ? null : lng,
        Number(hasDefault) ? 0 : 1,
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
         created_at, updated_at,
         (SELECT COUNT(*) FROM service_requests sr WHERE sr.pickup_address_id = addresses.id) AS request_count,
         EXISTS (SELECT 1 FROM shops s WHERE s.address_id = addresses.id) AS is_shop_address
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

/* -----------------------------------------------
   Shared helpers for edit / delete / default
------------------------------------------------ */
// Loads one of the caller's addresses with what references it.
async function findOwnAddress(addressId, userId) {
  const [[row]] = await db.promise().query(
    `SELECT a.id, a.is_default,
            (SELECT COUNT(*) FROM service_requests sr WHERE sr.pickup_address_id = a.id) AS request_count,
            EXISTS (SELECT 1 FROM shops s WHERE s.address_id = a.id) AS is_shop_address
     FROM addresses a
     WHERE a.id = ? AND a.user_id = ?`,
    [addressId, userId]
  );
  return row || null;
}

const SHOP_ADDRESS_MESSAGE =
  "This is your shop's address. It can't be changed from My addresses.";

/* -----------------------------------------------
   UPDATE ADDRESS
   Editing is allowed even if a repair used this address (correcting a typo
   is legitimate). A shop's address is locked here: changing it would move
   the shop's public location from a personal settings screen.
------------------------------------------------ */
router.put("/:id", authRequired, ADDRESS_TEXT, async (req, res) => {
  try {
    const text = (value) => String(value ?? "").trim();
    const validBarangay = canonicalBarangay(req.body.barangay);
    if (!validBarangay) {
      return res.status(400).json({ message: SERVICE_AREA_MESSAGE });
    }

    const address = await findOwnAddress(req.params.id, req.user.id);
    if (!address) return res.status(404).json({ message: "Address not found" });
    if (Number(address.is_shop_address)) return res.status(409).json({ message: SHOP_ADDRESS_MESSAGE });

    await db.promise().query(
      `UPDATE addresses
       SET country = ?, region = ?, province = ?, city = ?, barangay = ?,
           street = ?, postal_code = ?, label = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [
        SERVICE_AREA.country,
        SERVICE_AREA.region,
        SERVICE_AREA.province,
        SERVICE_AREA.city,
        validBarangay,
        text(req.body.street) || null,
        text(req.body.postal_code) || SERVICE_AREA.postal_code,
        text(req.body.label) || null,
        req.params.id,
        req.user.id,
      ]
    );

    const [[updated]] = await db.promise().query("SELECT * FROM addresses WHERE id = ?", [req.params.id]);
    res.json({ address: updated });
  } catch (err) {
    console.error("Address update error:", { code: err.code });
    res.status(500).json({ message: "Couldn't update this address." });
  }
});

/* -----------------------------------------------
   SET DEFAULT ADDRESS
------------------------------------------------ */
router.post("/:id/default", authRequired, async (req, res) => {
  try {
    const address = await findOwnAddress(req.params.id, req.user.id);
    if (!address) return res.status(404).json({ message: "Address not found" });

    // Exactly one default per user: clear the others and set this one together.
    await withTransaction(async (conn) => {
      await conn.query(
        "UPDATE addresses SET is_default = 0, updated_at = NOW() WHERE user_id = ? AND is_default = 1 AND id <> ?",
        [req.user.id, req.params.id]
      );
      await conn.query(
        "UPDATE addresses SET is_default = 1, updated_at = NOW() WHERE id = ? AND user_id = ?",
        [req.params.id, req.user.id]
      );
    });

    res.json({ message: "Default address updated" });
  } catch (err) {
    console.error("Address default error:", { code: err.code });
    res.status(500).json({ message: "Couldn't set the default address." });
  }
});

/* -----------------------------------------------
   DELETE ADDRESS
   Refused while a repair request or a shop references it (both are
   foreign keys), so repair history keeps its location.
------------------------------------------------ */
router.delete("/:id", authRequired, async (req, res) => {
  try {
    const address = await findOwnAddress(req.params.id, req.user.id);
    if (!address) return res.status(404).json({ message: "Address not found" });
    if (Number(address.is_shop_address)) return res.status(409).json({ message: SHOP_ADDRESS_MESSAGE });
    if (Number(address.request_count) > 0) {
      return res.status(409).json({
        message: "This address is part of a repair request, so it can't be deleted. You can still edit it.",
      });
    }

    await db.promise().query("DELETE FROM addresses WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    res.json({ message: "Address deleted" });
  } catch (err) {
    console.error("Address delete error:", { code: err.code });
    res.status(500).json({ message: "Couldn't delete this address." });
  }
});

export default router;
