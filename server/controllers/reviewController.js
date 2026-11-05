// controllers/reviewController.js
import db from "../config/db.js";

export const getBusinessShopReviews = (req, res) => {
  if (String(req.params.id) !== String(req.shopId)) {
    return res.status(403).json({ error: "You can only view reviews for your own shop" });
  }
  db.query(
    `SELECT r.id, r.request_id, r.rating, r.feedback AS comment,
      DATE_FORMAT(r.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
      u.first_name, u.last_name,
      sr.id AS repair_id, sr.status AS repair_status, sr.issue_description,
      sr.delivery_method,
      DATE_FORMAT(sr.completed_at, '%Y-%m-%dT%H:%i:%s') AS completed_at,
      d.name AS device_name, d.brand AS device_brand, d.model AS device_model,
      (SELECT GROUP_CONCAT(DISTINCT ss.name ORDER BY ss.name SEPARATOR ', ')
       FROM service_request_items sri
       JOIN shop_services ss ON ss.id = sri.service_id AND ss.shop_id = r.shop_id
       WHERE sri.request_id = sr.id) AS services
    FROM reviews r
    LEFT JOIN users u ON u.id = r.client_id
    LEFT JOIN service_requests sr ON sr.id = r.request_id
      AND sr.shop_id = r.shop_id AND sr.client_id = r.client_id
    LEFT JOIN devices d ON d.id = sr.device_id
    WHERE r.shop_id = ?
    ORDER BY r.created_at DESC, r.id DESC`,
    [req.shopId],
    (err, reviews) => {
      if (err) {
        console.error("Error fetching business reviews:", { code: err.code });
        return res.status(500).json({ error: "Unable to load review details" });
      }
      return res.json({ reviews });
    }
  );
};

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
