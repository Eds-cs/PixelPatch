// utils/shopRating.js
import db from "../config/db.js";

/**
 * Recomputes shops.rating_average for one shop from its reviews.
 * 0.00 means the shop has no reviews yet (the value business registration
 * writes for a new shop). Call after any insert/update/delete on reviews.
 */
export async function refreshShopRating(shopId) {
  await db.promise().query(
    `UPDATE shops
     SET rating_average = (
       SELECT ROUND(IFNULL(AVG(r.rating), 0), 2)
       FROM reviews r
       WHERE r.shop_id = ?
     )
     WHERE id = ?`,
    [shopId, shopId]
  );
}
