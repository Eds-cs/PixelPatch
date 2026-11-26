// server/controllers/shopServiceController.js
import db from "../config/db.js";
import { resolveShopDeliveryTypes } from "../utils/shopDeliveryTypes.js";



export const getServiceCategories = (req, res) => {
  const sql = `
    SELECT COLUMN_TYPE 
    FROM information_schema.COLUMNS 
    WHERE TABLE_NAME = 'shop_services' 
      AND COLUMN_NAME = 'category'
  `;

  db.query(sql, (err, result) => {
    if (err) { console.error("shopServices:", err.code); return res.status(500).json({ error: "Server error" }); }

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

    // Falls back to the shop's per-service flags when there is no explicit
    // shop_service_types row (see utils/shopDeliveryTypes.js).
    const serviceTypes = await resolveShopDeliveryTypes(shop_id);

    res.json({ serviceTypes });

  } catch (error) {
    console.error("getShopServiceTypes Error:", error);
    res.status(500).json({ message: "Server error fetching service types" });
  }
};

