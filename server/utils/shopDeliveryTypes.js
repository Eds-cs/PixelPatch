// utils/shopDeliveryTypes.js
import db from "../config/db.js";

/**
 * Which delivery methods a shop accepts, as { is_pickup, is_dropoff, is_onsite } (0/1).
 *
 * Two sources exist and they can disagree:
 *   1. shop_service_types — an explicit per-shop row. Only some shops have one.
 *   2. shop_services.accepts_* — per-service flags, written for every service.
 *
 * An explicit shop_service_types row wins, so shops that already rely on it
 * keep their behaviour. Shops without one (including every shop created by
 * business registration) accept a method when any of their admin-approved
 * services does.
 */
export async function resolveShopDeliveryTypes(shopId) {
  const [explicit] = await db.promise().query(
    `SELECT is_pickup, is_dropoff, is_onsite
     FROM shop_service_types
     WHERE shop_id = ?
     LIMIT 1`,
    [shopId]
  );

  if (explicit.length) {
    const row = explicit[0];
    return {
      is_pickup: Number(row.is_pickup) ? 1 : 0,
      is_dropoff: Number(row.is_dropoff) ? 1 : 0,
      is_onsite: Number(row.is_onsite) ? 1 : 0,
    };
  }

  const [[derived]] = await db.promise().query(
    `SELECT
       IFNULL(MAX(accepts_pickup), 0)  AS is_pickup,
       IFNULL(MAX(accepts_dropoff), 0) AS is_dropoff,
       IFNULL(MAX(accepts_onsite), 0)  AS is_onsite
     FROM shop_services
     WHERE shop_id = ? AND review_status = 'APPROVED'`,
    [shopId]
  );

  return {
    is_pickup: Number(derived.is_pickup) ? 1 : 0,
    is_dropoff: Number(derived.is_dropoff) ? 1 : 0,
    is_onsite: Number(derived.is_onsite) ? 1 : 0,
  };
}
