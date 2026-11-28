// controllers/admin/serviceReviewController.js
// Admin review of shop services (shop_services.review_status).
// Lists are paged and filtered server-side so the review queue stays usable
// with many shops and services.
import db from "../../config/db.js";

const STATUSES = ["PENDING", "APPROVED", "REJECTED"];
const MAX_PAGE = 100;
const MAX_BULK = 200;

function parseStatus(value) {
  const status = String(value || "PENDING").toUpperCase();
  return status === "ALL" || STATUSES.includes(status) ? status : null;
}

function parsePage(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), MAX_PAGE);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
}

// LIKE pattern with the user's % and _ treated literally.
const likePattern = (text) => `%${String(text).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

async function statusCounts() {
  const [rows] = await db.promise().query(
    "SELECT review_status, COUNT(*) AS n FROM shop_services GROUP BY review_status"
  );
  return Object.fromEntries(STATUSES.map((key) => [key, Number(rows.find((row) => row.review_status === key)?.n || 0)]));
}

// A dispute needs an admin when the client turned down the shop's proposal
// (REJECTED), or the shop hasn't answered within 2 days (AGENTS.md, business
// rule 7). Shared with the disputes and repairs admin screens.
export const DISPUTE_NEEDS_ADMIN_SQL =
  "(d.status = 'REJECTED' OR (d.status = 'OPEN' AND d.created_at < NOW() - INTERVAL 2 DAY))";
// A repair is stuck when the shop hasn't accepted or rejected it within 2 days
// (the client didn't cancel).
export const REPAIR_AWAITING_SHOP_SQL =
  "(sr.decision = 'PENDING' AND (sr.client_approved IS NULL OR sr.client_approved <> 0) AND sr.created_at < NOW() - INTERVAL 2 DAY)";

/* GET /api/admin/summary — counts for the admin dashboard and navigation.
   The *_since fields are the oldest waiting item's timestamp (null if none). */
export const getAdminSummary = async (req, res) => {
  try {
    const [[counts]] = await db.promise().query(
      `SELECT
         (SELECT COUNT(*) FROM shop_services WHERE review_status = 'PENDING') AS pending_services,
         (SELECT MIN(updated_at) FROM shop_services WHERE review_status = 'PENDING') AS pending_services_since,
         (SELECT COUNT(*) FROM shops WHERE is_verified = 0) AS pending_shops,
         (SELECT MIN(created_at) FROM shops WHERE is_verified = 0) AS pending_shops_since,
         (SELECT COUNT(*) FROM disputes d WHERE ${DISPUTE_NEEDS_ADMIN_SQL}) AS disputes_need_admin,
         (SELECT MIN(d.created_at) FROM disputes d WHERE ${DISPUTE_NEEDS_ADMIN_SQL}) AS disputes_need_admin_since,
         (SELECT COUNT(*) FROM disputes WHERE status IN ('OPEN', 'SHOP_PROPOSED')) AS active_disputes,
         (SELECT COUNT(*) FROM service_requests sr WHERE ${REPAIR_AWAITING_SHOP_SQL}) AS repairs_awaiting_shop,
         (SELECT MIN(sr.created_at) FROM service_requests sr WHERE ${REPAIR_AWAITING_SHOP_SQL}) AS repairs_awaiting_shop_since,
         (SELECT COUNT(*) FROM service_requests
           WHERE decision <> 'REJECTED' AND status <> 'COMPLETED'
             AND (client_approved IS NULL OR client_approved <> 0)) AS active_repairs,
         (SELECT COUNT(*) FROM users) AS users,
         (SELECT COUNT(*) FROM shops WHERE is_verified = 1) AS verified_shops,
         (SELECT COUNT(*) FROM shops) AS shops,
         (SELECT COUNT(*) FROM disputes WHERE status = 'OPEN') AS open_disputes,
         (SELECT COUNT(*) FROM warranty_claims WHERE status = 'ESCALATED') AS warranty_claims_need_admin,
         (SELECT MIN(escalated_at) FROM warranty_claims WHERE status = 'ESCALATED') AS warranty_claims_need_admin_since`
    );
    res.json({ summary: counts });
  } catch (err) {
    console.error("getAdminSummary:", { code: err.code });
    res.status(500).json({ message: "Couldn't load the admin summary." });
  }
};

/* GET /api/admin/services/shops?status=&q=&limit=&offset=
   Shops that have services in the given status, with per-status counts.
   Most waiting first, then the longest-waiting. */
export const listShopsForReview = async (req, res) => {
  const status = parseStatus(req.query.status);
  if (!status) return res.status(400).json({ message: "Unknown review status" });
  const { limit, offset } = parsePage(req.query);
  const q = String(req.query.q ?? "").trim();

  const where = ["(? = 'ALL' OR ss.review_status = ?)"];
  const params = [status, status];
  if (q) {
    where.push("(s.name LIKE ? OR CONCAT_WS(' ', owner.first_name, owner.last_name) LIKE ?)");
    params.push(likePattern(q), likePattern(q));
  }

  const grouped = `
    SELECT s.id AS shop_id, s.name AS shop_name, s.is_verified AS shop_verified,
           CONCAT_WS(' ', owner.first_name, owner.last_name) AS owner_name,
           (SELECT COUNT(*) FROM shop_services x WHERE x.shop_id = s.id AND x.review_status = 'PENDING') AS pending,
           (SELECT COUNT(*) FROM shop_services x WHERE x.shop_id = s.id AND x.review_status = 'REJECTED') AS rejected,
           (SELECT COUNT(*) FROM shop_services x WHERE x.shop_id = s.id AND x.review_status = 'APPROVED') AS approved,
           (SELECT DATE_FORMAT(MIN(x.updated_at), '%Y-%m-%dT%H:%i:%s') FROM shop_services x
             WHERE x.shop_id = s.id AND x.review_status = 'PENDING') AS oldest_pending_at
    FROM shops s
    JOIN shop_services ss ON ss.shop_id = s.id
    LEFT JOIN users owner ON owner.id = s.user_id
    WHERE ${where.join(" AND ")}
    GROUP BY s.id`;

  try {
    const [shops] = await db.promise().query(
      `${grouped}
       ORDER BY pending DESC, oldest_pending_at IS NULL, oldest_pending_at ASC, shop_name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.promise().query(`SELECT COUNT(*) AS total FROM (${grouped}) grouped`, params);
    res.json({ shops, total: Number(total), counts: await statusCounts() });
  } catch (err) {
    console.error("listShopsForReview:", { code: err.code });
    res.status(500).json({ message: "Couldn't load shops for review." });
  }
};

/* GET /api/admin/services?status=&shop_id=&q=&limit=&offset= */
export const listServicesForReview = async (req, res) => {
  const status = parseStatus(req.query.status);
  if (!status) return res.status(400).json({ message: "Unknown review status" });
  const { limit, offset } = parsePage(req.query);
  const q = String(req.query.q ?? "").trim();
  const shopId = req.query.shop_id ? Number(req.query.shop_id) : null;
  if (shopId !== null && (!Number.isSafeInteger(shopId) || shopId <= 0)) {
    return res.status(400).json({ message: "Invalid shop" });
  }

  const where = ["(? = 'ALL' OR ss.review_status = ?)"];
  const params = [status, status];
  if (shopId) {
    where.push("ss.shop_id = ?");
    params.push(shopId);
  }
  if (q) {
    where.push("(ss.name LIKE ? OR ss.category LIKE ? OR ss.custom_category LIKE ? OR ss.description LIKE ? OR s.name LIKE ?)");
    params.push(likePattern(q), likePattern(q), likePattern(q), likePattern(q), likePattern(q));
  }
  const from = `
    FROM shop_services ss
    JOIN shops s ON s.id = ss.shop_id
    LEFT JOIN users owner ON owner.id = s.user_id
    LEFT JOIN users reviewer ON reviewer.id = ss.reviewed_by
    WHERE ${where.join(" AND ")}`;

  try {
    const [services] = await db.promise().query(
      `SELECT ss.id, ss.shop_id, ss.name, ss.category, ss.custom_category, ss.description, ss.base_price,
              ss.estimated_timeframe, ss.accepts_pickup, ss.accepts_dropoff, ss.accepts_onsite,
              ss.review_status, ss.review_note,
              DATE_FORMAT(ss.reviewed_at, '%Y-%m-%dT%H:%i:%s') AS reviewed_at,
              DATE_FORMAT(ss.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
              DATE_FORMAT(ss.updated_at, '%Y-%m-%dT%H:%i:%s') AS updated_at,
              s.name AS shop_name, s.is_verified AS shop_verified,
              CONCAT_WS(' ', owner.first_name, owner.last_name) AS owner_name,
              CONCAT_WS(' ', reviewer.first_name, reviewer.last_name) AS reviewer_name
       ${from}
       ORDER BY (ss.review_status = 'PENDING') DESC, ss.updated_at ASC, ss.id ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.promise().query(`SELECT COUNT(*) AS total ${from}`, params);
    res.json({ services, total: Number(total), counts: await statusCounts() });
  } catch (err) {
    console.error("listServicesForReview:", { code: err.code });
    res.status(500).json({ message: "Couldn't load services for review." });
  }
};

function validateNote(body) {
  const note = String(body?.note ?? "").trim();
  if (!note) return { error: "Tell the shop why this service was rejected." };
  if (note.length > 1000) return { error: "Keep the reason under 1000 characters." };
  return { note };
}

/* POST /api/admin/services/:id/approve */
export const approveService = async (req, res) => {
  try {
    const [result] = await db.promise().query(
      `UPDATE shop_services
       SET review_status = 'APPROVED', review_note = NULL, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [req.user.id, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Service not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("approveService:", { code: err.code });
    res.status(500).json({ message: "Couldn't approve this service." });
  }
};

/* POST /api/admin/services/:id/reject  { note } — the shop sees the note */
export const rejectService = async (req, res) => {
  const { note, error } = validateNote(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const [result] = await db.promise().query(
      `UPDATE shop_services
       SET review_status = 'REJECTED', review_note = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [note, req.user.id, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Service not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("rejectService:", { code: err.code });
    res.status(500).json({ message: "Couldn't reject this service." });
  }
};

/* POST /api/admin/services/bulk  { ids: number[], action: "approve" | "reject", note? }
   One statement, so the whole batch changes together. Approving skips
   services that are already approved, so their review history is kept. */
export const bulkReviewServices = async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids.map(Number))] : [];
  const action = String(req.body?.action ?? "");

  if (!ids.length || ids.length > MAX_BULK || ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    return res.status(400).json({ message: `Select between 1 and ${MAX_BULK} services.` });
  }
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ message: "Unknown action" });
  }

  const placeholders = ids.map(() => "?").join(",");
  try {
    let result;
    if (action === "approve") {
      [result] = await db.promise().query(
        `UPDATE shop_services
         SET review_status = 'APPROVED', review_note = NULL, reviewed_by = ?, reviewed_at = NOW()
         WHERE id IN (${placeholders}) AND review_status <> 'APPROVED'`,
        [req.user.id, ...ids]
      );
    } else {
      const { note, error } = validateNote(req.body);
      if (error) return res.status(400).json({ message: error });
      [result] = await db.promise().query(
        `UPDATE shop_services
         SET review_status = 'REJECTED', review_note = ?, reviewed_by = ?, reviewed_at = NOW()
         WHERE id IN (${placeholders})`,
        [note, req.user.id, ...ids]
      );
    }
    res.json({ success: true, updated: result.affectedRows });
  } catch (err) {
    console.error("bulkReviewServices:", { code: err.code });
    res.status(500).json({ message: "Couldn't update the selected services." });
  }
};
