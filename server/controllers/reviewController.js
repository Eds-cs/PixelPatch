// controllers/reviewController.js
import db from "../config/db.js";

export const getShopReviews = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      r.id,
      r.shop_id,
      r.client_id,
      r.request_id,
      r.rating,
      r.feedback AS comment,
      r.created_at,
      u.first_name, u.last_name
    FROM reviews r
    LEFT JOIN users u ON u.id = r.client_id
    WHERE r.shop_id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching reviews:", err);
      return res.status(500).json({ error: "Server error fetching reviews" });
    }

    res.json({ reviews: results });
  });
};
