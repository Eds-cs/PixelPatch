import db from "../config/db.js";

export const businessShopRequired = async (req, res, next) => {
  if (Number(req.user?.role_id) !== 3) {
    return res.status(403).json({ message: "Business access only" });
  }

  try {
    const [shops] = await db.promise().query(
      "SELECT id FROM shops WHERE user_id = ? LIMIT 1",
      [req.user.id]
    );

    if (shops.length === 0) {
      return res.status(403).json({ message: "No shop is associated with this account" });
    }

    req.shopId = shops[0].id;
    return next();
  } catch (error) {
    console.error("Business shop authorization lookup failed:", error);
    return res.status(500).json({ message: "Unable to verify business access" });
  }
};