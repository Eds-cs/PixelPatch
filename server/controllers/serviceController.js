// controllers/serviceController.js
import db from "../config/db.js";

export const getShopServices = (req, res) => {
  const { id } = req.params;

  db.query(
    // Clients only see services an admin has approved.
    "SELECT * FROM shop_services WHERE shop_id = ? AND review_status = 'APPROVED'",
    [id],
    (err, results) => {
      if (err) {
        console.error("Error fetching services:", err);
        return res.status(500).json({ error: "Server error fetching services" });
      }

      res.json({ services: results });
    }
  );
};
