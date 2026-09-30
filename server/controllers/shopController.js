// controllers/shopController.js
import db from "../config/db.js";

export const getShopById = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      s.*, 
      a.street, a.barangay, a.province, a.region, a.country 
    FROM shops s
    LEFT JOIN addresses a ON a.id = s.address_id
    WHERE s.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching shop:", err);
      return res.status(500).json({ error: "Server error fetching shop" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Shop not found" });
    }

    res.json({ shop: results[0] });
  });
};