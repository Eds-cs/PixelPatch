// server/controllers/shopServiceController.js
import db from "../config/db.js";



export const getServiceCategories = (req, res) => {
  const sql = `
    SELECT COLUMN_TYPE 
    FROM information_schema.COLUMNS 
    WHERE TABLE_NAME = 'shop_services' 
      AND COLUMN_NAME = 'category'
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    const raw = result[0].COLUMN_TYPE;        // enum('SMARTPHONE','DESKTOP',...)
    const categories = raw
      .replace("enum(", "")
      .replace(")", "")
      .replace(/'/g, "")
      .split(",");

    res.json({ categories });
  });
};

export const getShopServiceTypes = async (req, res) => {
  try {
    const { shop_id } = req.params;

    const [rows] = await db.promise().query(
      `SELECT is_onsite, is_dropoff, is_pickup
       FROM shop_service_types
       WHERE shop_id = ?
       LIMIT 1`,
      [shop_id]
    );

    if (rows.length === 0) {
      return res.json({
        serviceTypes: { is_onsite: 0, is_dropoff: 0, is_pickup: 0 }
      });
    }

    res.json({ serviceTypes: rows[0] });

  } catch (error) {
    console.error("getShopServiceTypes Error:", error);
    res.status(500).json({ message: "Server error fetching service types" });
  }
};

