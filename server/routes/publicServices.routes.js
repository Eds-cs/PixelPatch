import express from "express";
import db from "../config/db.js";

const router = express.Router();

/* ===============================
   TOP SHOPS
================================ */
router.get("/shops", (req, res) => {
  const sql = `
    SELECT
      s.id,
      s.name,
      s.rating_average,
      s.is_verified,
      s.open_time,
      s.closing_time,
      s.days_from,
      s.days_to,
      a.street,
      a.barangay,
      a.province
    FROM shops s
    JOIN addresses a ON a.id = s.address_id
    WHERE s.is_verified = 1
    ORDER BY s.rating_average DESC
    LIMIT 10
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("❌ TOP SHOPS:", err);
      return res.status(500).json({ message: "Failed to load shops" });
    }

    res.json({ shops: rows });
  });
});

/* ===============================
   POPULAR SERVICES
================================ */
router.get("/services", (req, res) => {
  const sql = `
    SELECT
      CONCAT(ss.name, '-', ss.category) AS service_key,
      ss.name,
      ss.category,
      COUNT(DISTINCT ss.shop_id) AS shop_count,
      ROUND(AVG(s.rating_average), 2) AS avg_shop_rating,
      MIN(ss.base_price) AS min_price,
      MAX(ss.base_price) AS max_price
    FROM shop_services ss
    JOIN shops s ON s.id = ss.shop_id
    WHERE s.is_verified = 1
    GROUP BY ss.name, ss.category
    ORDER BY avg_shop_rating DESC, shop_count DESC
    LIMIT 10
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("❌ POPULAR SERVICES:", err);
      return res.status(500).json({ message: "Failed to load services" });
    }

    res.json({ services: rows });
  });
});


/* ===============================
   SERVICE DETAILS (PUBLIC)
   GET /api/public/services/:serviceKey
================================ */
router.get("/services/:serviceKey", (req, res) => {
  const [name, category] = req.params.serviceKey.split("-");

  if (!name || !category) {
    return res.status(400).json({ message: "Invalid service key" });
  }

  /* =========================
     SERVICE INFO
  ========================= */
  const serviceSql = `
    SELECT
      ss.name,
      ss.category,
      MIN(ss.base_price) AS min_price,
      MAX(ss.base_price) AS max_price,
      MIN(ss.estimated_timeframe) AS min_estimated_time,
      MAX(ss.estimated_timeframe) AS max_estimated_time
    FROM shop_services ss
    JOIN shops s ON s.id = ss.shop_id
    WHERE ss.name = ?
      AND ss.category = ?
      AND s.is_verified = 1
    GROUP BY ss.name, ss.category
    LIMIT 1
  `;

  db.query(serviceSql, [name, category], (err, serviceRows) => {
    if (err || serviceRows.length === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    /* =========================
       SHOPS OFFERING SERVICE
    ========================= */
    const shopsSql = `
      SELECT
        s.id AS shop_id,
        s.name AS shop_name,
        s.rating_average,
        s.is_verified,
        a.street,
        a.barangay,
        a.province,
        ss.base_price,
        ss.estimated_timeframe
      FROM shop_services ss
      JOIN shops s ON s.id = ss.shop_id
      JOIN addresses a ON a.id = s.address_id
      WHERE ss.name = ?
        AND ss.category = ?
        AND s.is_verified = 1
      ORDER BY s.rating_average DESC
    `;

    db.query(shopsSql, [name, category], (err2, shopRows) => {
      if (err2) {
        return res.status(500).json({ message: "Failed to load shops" });
      }

      res.json({
        service: serviceRows[0],
        shops: shopRows
      });
    });
  });
});


export default router;
