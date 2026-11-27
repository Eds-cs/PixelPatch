// controllers/shopController.js
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import { hideContactInfo } from "../utils/contactFilter.js";

// The signed-in user's id when the request carries a valid token, else null.
// GET /shops/:id is public, so a missing or bad token is not an error.
function viewerId(req) {
  const token = (req.headers.authorization || "").split(" ")[1];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET).id ?? null;
  } catch {
    return null;
  }
}

// GET /api/shops/:id
// The shop's phone and email are only returned to its owner (business profile
// and repair screens). Clients reach a shop through PixelPatch chat, so the
// job, payment and any dispute stay on the platform; contact details in the
// public description are hidden too (utils/contactFilter.js).
export const getShopById = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      s.*,
      a.street, a.barangay, a.city, a.province, a.region, a.country,
      a.postal_code, a.latitude, a.longitude
    FROM shops s
    LEFT JOIN addresses a ON a.id = s.address_id
    WHERE s.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching shop:", err.code);
      return res.status(500).json({ error: "Server error fetching shop" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Shop not found" });
    }

    const shop = results[0];
    const isOwner = String(shop.user_id) === String(viewerId(req));
    if (!isOwner) {
      delete shop.phone_number;
      delete shop.email;
      shop.description = hideContactInfo(shop.description);
    }
    res.json({ shop });
  });
};
