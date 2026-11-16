// controllers/business/serviceController.js
// Shop service catalog management for the authenticated owner's shop.
// Every query is scoped to req.shopId (set by businessShopRequired).
import db from "../../config/db.js";

// Verified shop_services.category enum values.
const CATEGORIES = ["SMARTPHONE", "DESKTOP", "CONTROLLER", "TABLET", "SMARTWATCH", "LAPTOP", "OTHER"];

const text = (value) => String(value ?? "").trim();
const flag = (value) => (value === true || value === 1 || value === "1" || value === "true" ? 1 : 0);

// Returns { values } or { error }.
function validateService(body) {
  const name = text(body.name);
  const category = text(body.category).toUpperCase();
  const description = text(body.description);
  const timeframe = text(body.estimated_timeframe);
  const price = Number(body.base_price);
  const methods = {
    accepts_pickup: flag(body.accepts_pickup),
    accepts_dropoff: flag(body.accepts_dropoff),
    accepts_onsite: flag(body.accepts_onsite),
  };

  if (!name || name.length > 100) return { error: "Enter a service name (up to 100 characters)." };
  if (!CATEGORIES.includes(category)) return { error: "Choose a device category." };
  if (!Number.isFinite(price) || price <= 0 || price > 99999999.99) return { error: "Enter a base price above 0." };
  if (!timeframe || timeframe.length > 255) return { error: "Enter an estimated turnaround (for example, 1-2 days)." };
  if (!methods.accepts_pickup && !methods.accepts_dropoff && !methods.accepts_onsite) {
    return { error: "Choose at least one service method." };
  }

  return {
    values: {
      name,
      category,
      description,
      base_price: Math.round(price * 100) / 100,
      estimated_timeframe: timeframe,
      ...methods,
    },
  };
}

/* GET /api/business/services */
export const listShopServices = async (req, res) => {
  try {
    const [services] = await db.promise().query(
      `SELECT ss.*,
              (SELECT COUNT(*) FROM service_request_items sri WHERE sri.service_id = ss.id) AS request_count,
              (SELECT COUNT(*)
               FROM service_request_items sri
               JOIN request_quotations rq ON rq.request_id = sri.request_id
               WHERE sri.service_id = ss.id AND rq.status = 'PENDING') AS open_quotation_count
       FROM shop_services ss
       WHERE ss.shop_id = ?
       ORDER BY ss.name ASC, ss.id ASC`,
      [req.shopId]
    );
    res.json({ services, categories: CATEGORIES });
  } catch (err) {
    console.error("listShopServices:", { code: err.code });
    res.status(500).json({ message: "Couldn't load your services." });
  }
};

/* POST /api/business/services */
export const createShopService = async (req, res) => {
  const { values, error } = validateService(req.body ?? {});
  if (error) return res.status(400).json({ message: error });

  try {
    const [result] = await db.promise().query(
      `INSERT INTO shop_services
        (shop_id, name, category, description, base_price, estimated_timeframe,
         accepts_pickup, accepts_onsite, accepts_dropoff, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        req.shopId, values.name, values.category, values.description, values.base_price,
        values.estimated_timeframe, values.accepts_pickup, values.accepts_onsite, values.accepts_dropoff,
      ]
    );
    // review_status defaults to PENDING: hidden from clients until an admin approves.
    res.status(201).json({ success: true, id: result.insertId, reviewStatus: "PENDING" });
  } catch (err) {
    console.error("createShopService:", { code: err.code });
    res.status(500).json({ message: "Couldn't add this service." });
  }
};

/* PUT /api/business/services/:id */
export const updateShopService = async (req, res) => {
  const { values, error } = validateService(req.body ?? {});
  if (error) return res.status(400).json({ message: error });

  try {
    const [[current]] = await db.promise().query(
      `SELECT ss.base_price, ss.name, ss.category, ss.description, ss.review_status,
              (SELECT COUNT(*)
               FROM service_request_items sri
               JOIN request_quotations rq ON rq.request_id = sri.request_id
               WHERE sri.service_id = ss.id AND rq.status = 'PENDING') AS open_quotation_count
       FROM shop_services ss
       WHERE ss.id = ? AND ss.shop_id = ?`,
      [req.params.id, req.shopId]
    );

    if (!current) return res.status(404).json({ message: "Service not found" });

    // Payment-link amounts are recomputed from current base prices, so a price
    // change while a quotation is open would make the payment differ from the
    // quotation the client approved.
    const priceChanged = Math.round(Number(current.base_price) * 100) !== Math.round(values.base_price * 100);
    if (priceChanged && Number(current.open_quotation_count) > 0) {
      return res.status(409).json({
        message: "This service is in an open quotation, so its price can't change until that repair is paid or cancelled. You can still edit the other details.",
      });
    }

    // Changing what the service is (name, category, description) needs admin
    // review again; so does editing a rejected service (resubmission). Price,
    // turnaround and service methods change without review.
    const identityChanged =
      current.name !== values.name ||
      current.category !== values.category ||
      String(current.description ?? "") !== values.description;
    const needsReview = identityChanged || current.review_status === "REJECTED";

    await db.promise().query(
      `UPDATE shop_services
       SET name = ?, category = ?, description = ?, base_price = ?, estimated_timeframe = ?,
           accepts_pickup = ?, accepts_onsite = ?, accepts_dropoff = ?, updated_at = NOW(),
           review_status = IF(?, 'PENDING', review_status),
           review_note = IF(?, NULL, review_note),
           reviewed_by = IF(?, NULL, reviewed_by),
           reviewed_at = IF(?, NULL, reviewed_at)
       WHERE id = ? AND shop_id = ?`,
      [
        values.name, values.category, values.description, values.base_price, values.estimated_timeframe,
        values.accepts_pickup, values.accepts_onsite, values.accepts_dropoff,
        needsReview, needsReview, needsReview, needsReview,
        req.params.id, req.shopId,
      ]
    );
    res.json({ success: true, reviewStatus: needsReview ? "PENDING" : current.review_status });
  } catch (err) {
    console.error("updateShopService:", { code: err.code });
    res.status(500).json({ message: "Couldn't update this service." });
  }
};

/* DELETE /api/business/services/:id
   Only services no repair request has used: request history keeps its
   service lines (service_request_items.service_id is a foreign key). */
export const deleteShopService = async (req, res) => {
  try {
    const [[service]] = await db.promise().query(
      `SELECT ss.id,
              (SELECT COUNT(*) FROM service_request_items sri WHERE sri.service_id = ss.id) AS request_count
       FROM shop_services ss
       WHERE ss.id = ? AND ss.shop_id = ?`,
      [req.params.id, req.shopId]
    );

    if (!service) return res.status(404).json({ message: "Service not found" });
    if (Number(service.request_count) > 0) {
      return res.status(409).json({
        message: "This service is part of past repair requests, so it can't be deleted. You can still edit it.",
      });
    }

    await db.promise().query("DELETE FROM shop_services WHERE id = ? AND shop_id = ?", [req.params.id, req.shopId]);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteShopService:", { code: err.code });
    res.status(500).json({ message: "Couldn't delete this service." });
  }
};
